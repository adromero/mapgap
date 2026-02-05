import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IndustryPicker } from '../IndustryPicker';
import type { Industry } from '@/types';

const mockIndustries: Industry[] = [
  { id: 'coffee-shops', label: 'Coffee Shops', naicsCodes: ['722515'], description: 'Coffee & snack bars' },
  { id: 'pet-grooming', label: 'Pet Grooming', naicsCodes: ['812910'], description: 'Pet care services' },
  { id: 'gyms', label: 'Gyms & Fitness', naicsCodes: ['713940'], description: 'Fitness centers' },
];

describe('IndustryPicker', () => {
  it('renders with label', () => {
    render(
      <IndustryPicker industries={mockIndustries} selectedId={null} onSelect={() => {}} />
    );
    expect(screen.getByText('Industry')).toBeInTheDocument();
  });

  it('shows placeholder when no industry is selected', () => {
    render(
      <IndustryPicker industries={mockIndustries} selectedId={null} onSelect={() => {}} />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Select industry...');
  });

  it('shows selected industry label', () => {
    render(
      <IndustryPicker industries={mockIndustries} selectedId="coffee-shops" onSelect={() => {}} />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Coffee Shops');
  });

  it('shows loading state', () => {
    render(
      <IndustryPicker industries={[]} selectedId={null} onSelect={() => {}} loading />
    );
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Loading...');
    expect(combobox).toBeDisabled();
  });

  it('opens popover and shows industries on click', async () => {
    const user = userEvent.setup();
    render(
      <IndustryPicker industries={mockIndustries} selectedId={null} onSelect={() => {}} />
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByPlaceholderText('Search industries...')).toBeInTheDocument();
    expect(screen.getByText('Coffee Shops')).toBeInTheDocument();
    expect(screen.getByText('Pet Grooming')).toBeInTheDocument();
    expect(screen.getByText('Gyms & Fitness')).toBeInTheDocument();
  });

  it('calls onSelect with industry id when an industry is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <IndustryPicker industries={mockIndustries} selectedId={null} onSelect={onSelect} />
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Coffee Shops'));
    expect(onSelect).toHaveBeenCalledWith('coffee-shops');
  });

  it('calls onSelect with null when the selected industry is clicked again (deselect)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <IndustryPicker industries={mockIndustries} selectedId="coffee-shops" onSelect={onSelect} />
    );
    await user.click(screen.getByRole('combobox'));
    // "Coffee Shops" appears in both the trigger and the dropdown list
    const coffeeOptions = screen.getAllByText('Coffee Shops');
    await user.click(coffeeOptions[coffeeOptions.length - 1]);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('renders combobox with aria-expanded attribute', async () => {
    const user = userEvent.setup();
    render(
      <IndustryPicker industries={mockIndustries} selectedId={null} onSelect={() => {}} />
    );
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await user.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
  });
});
