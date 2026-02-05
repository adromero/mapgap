import { render, screen } from '@testing-library/react';
import { KPICards } from '../KPICards';

describe('KPICards', () => {
  it('renders without crashing', () => {
    render(
      <KPICards score={75} establishmentCount={120} population={50000} medianIncome={55000} />
    );
    expect(screen.getByTestId('kpi-cards')).toBeInTheDocument();
  });

  it('displays all four KPI values', () => {
    render(
      <KPICards score={75} establishmentCount={120} population={50000} medianIncome={55000} />
    );
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
    expect(screen.getByText('$55,000')).toBeInTheDocument();
  });

  it('displays card titles', () => {
    render(
      <KPICards score={75} establishmentCount={120} population={50000} medianIncome={55000} />
    );
    expect(screen.getByText('Opportunity Score')).toBeInTheDocument();
    expect(screen.getByText('Establishments')).toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByText('Median Income')).toBeInTheDocument();
  });
});
