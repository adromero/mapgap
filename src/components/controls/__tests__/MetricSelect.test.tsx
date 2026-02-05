import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricSelect } from '../MetricSelect';

describe('MetricSelect', () => {
  it('renders with label', () => {
    render(<MetricSelect value="score" onChange={() => {}} />);
    expect(screen.getByText('Metric')).toBeInTheDocument();
  });

  it('shows the selected metric label', () => {
    render(<MetricSelect value="score" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Opportunity Score');
  });

  it('shows establishment count when selected', () => {
    render(<MetricSelect value="establishmentCount" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Establishment Count');
  });

  it('shows population per business when selected', () => {
    render(<MetricSelect value="populationPerBiz" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Population per Business');
  });

  it('opens dropdown and shows all metric options', async () => {
    const user = userEvent.setup();
    render(<MetricSelect value="score" onChange={() => {}} />);
    await user.click(screen.getByRole('combobox'));
    // "Opportunity Score" appears both in the trigger and the dropdown
    expect(screen.getAllByText('Opportunity Score').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Establishment Count')).toBeInTheDocument();
    expect(screen.getByText('Population per Business')).toBeInTheDocument();
  });

  it('calls onChange with the selected metric key', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MetricSelect value="score" onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Establishment Count'));
    expect(onChange).toHaveBeenCalledWith('establishmentCount');
  });
});
