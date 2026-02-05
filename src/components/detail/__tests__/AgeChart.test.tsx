import { render, screen } from '@testing-library/react';
import { AgeChart } from '../AgeChart';
import type { AgeDistribution } from '@/types';

// Mock ResponsiveContainer which doesn't work in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 200 }}>{children}</div>
    ),
  };
});

const mockData: AgeDistribution = {
  under18: 22,
  age18to34: 20,
  age35to54: 25,
  age55to74: 23,
  age75plus: 10,
};

describe('AgeChart', () => {
  it('renders without crashing', () => {
    render(<AgeChart data={mockData} />);
    expect(screen.getByTestId('age-chart')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(<AgeChart data={mockData} />);
    expect(screen.getByText('Age Distribution')).toBeInTheDocument();
  });
});
