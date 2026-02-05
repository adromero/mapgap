import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StateFilter } from '../StateFilter';

describe('StateFilter', () => {
  it('renders with label', () => {
    render(<StateFilter value={null} onChange={() => {}} />);
    expect(screen.getByText('State')).toBeInTheDocument();
  });

  it('shows "All states" when value is null', () => {
    render(<StateFilter value={null} onChange={() => {}} />);
    expect(screen.getByText('All states')).toBeInTheDocument();
  });

  it('shows the selected state abbreviation value', () => {
    render(<StateFilter value="CA" onChange={() => {}} />);
    // The trigger should display the selected value
    expect(screen.getByRole('combobox')).toHaveTextContent('California');
  });

  it('opens dropdown and shows state options', async () => {
    const user = userEvent.setup();
    render(<StateFilter value={null} onChange={() => {}} />);
    await user.click(screen.getByRole('combobox'));
    // Should show "All states" option and individual states
    expect(screen.getByText('Alabama')).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText('Texas')).toBeInTheDocument();
  });

  it('calls onChange with state abbreviation when a state is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StateFilter value={null} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('California'));
    expect(onChange).toHaveBeenCalledWith('CA');
  });

  it('calls onChange with null when "All states" is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StateFilter value="CA" onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('All states'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
