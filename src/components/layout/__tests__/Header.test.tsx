import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { ThemeProvider } from '@/components/ThemeProvider';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider defaultTheme="light">{ui}</ThemeProvider>);
}

describe('Header', () => {
  it('renders the site name', () => {
    renderWithTheme(<Header />);
    expect(screen.getByText('MapGap')).toBeInTheDocument();
  });

  it('renders the About button', () => {
    renderWithTheme(<Header />);
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders the theme toggle button', () => {
    renderWithTheme(<Header />);
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
  });

  it('renders the menu toggle button', () => {
    renderWithTheme(<Header />);
    expect(screen.getByText('Toggle menu')).toBeInTheDocument();
  });

  it('calls onMenuClick when menu button is clicked', async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();
    renderWithTheme(<Header onMenuClick={onMenuClick} />);
    await user.click(screen.getByText('Toggle menu'));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });

  it('toggles theme when theme button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Header />);
    const themeButton = screen.getByText('Toggle theme').closest('button')!;
    await user.click(themeButton);
    // After clicking, theme should switch to dark
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
