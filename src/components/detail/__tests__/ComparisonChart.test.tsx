import { render, screen } from '@testing-library/react';
import { ComparisonChart } from '../ComparisonChart';
import type { StateAverages } from '@/types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 200 }}>{children}</div>
    ),
  };
});

const mockStateAverages: StateAverages = {
  medianIncome: 60000,
  medianAge: 38,
  populationPerSqMi: 150,
};

describe('ComparisonChart', () => {
  it('renders without crashing', () => {
    render(
      <ComparisonChart
        countyIncome={55000}
        countyAge={35}
        countyPopulation={50000}
        stateAverages={mockStateAverages}
        countyName="Test County"
      />
    );
    expect(screen.getByTestId('comparison-chart')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(
      <ComparisonChart
        countyIncome={55000}
        countyAge={35}
        countyPopulation={50000}
        stateAverages={mockStateAverages}
        countyName="Test County"
      />
    );
    expect(screen.getByText('County vs State Average')).toBeInTheDocument();
  });
});
