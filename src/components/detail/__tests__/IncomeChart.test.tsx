import { render, screen } from '@testing-library/react';
import { IncomeChart } from '../IncomeChart';
import type { IncomeDistribution } from '@/types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 200 }}>{children}</div>
    ),
  };
});

const mockData: IncomeDistribution = {
  under25k: 15,
  income25kTo50k: 25,
  income50kTo75k: 25,
  income75kTo100k: 20,
  over100k: 15,
};

describe('IncomeChart', () => {
  it('renders without crashing', () => {
    render(<IncomeChart data={mockData} />);
    expect(screen.getByTestId('income-chart')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(<IncomeChart data={mockData} />);
    expect(screen.getByText('Income Brackets')).toBeInTheDocument();
  });
});
