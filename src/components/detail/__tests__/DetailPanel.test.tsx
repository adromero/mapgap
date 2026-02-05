import { render, screen } from '@testing-library/react';
import { DetailPanel } from '../DetailPanel';
import type { CountyScore, CountyDemographics } from '@/types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 200 }}>{children}</div>
    ),
  };
});

const mockScore: CountyScore = {
  fips: '01001',
  name: 'Autauga County',
  state: 'AL',
  score: 72,
  establishmentCount: 15,
  populationPerBiz: 3600,
};

const mockDemographics: CountyDemographics = {
  fips: '01001',
  name: 'Autauga County',
  state: 'AL',
  population: 54000,
  medianIncome: 52000,
  medianAge: 37.5,
  householdSize: 2.7,
  populationGrowth: 3.2,
  ageDistribution: {
    under18: 23,
    age18to34: 18,
    age35to54: 26,
    age55to74: 24,
    age75plus: 9,
  },
  incomeDistribution: {
    under25k: 18,
    income25kTo50k: 26,
    income50kTo75k: 22,
    income75kTo100k: 18,
    over100k: 16,
  },
  stateAverages: {
    medianIncome: 50000,
    medianAge: 39,
    populationPerSqMi: 95,
  },
};

describe('DetailPanel', () => {
  const defaultProps = {
    countyFips: '01001',
    countyScore: mockScore,
    demographics: mockDemographics,
    loading: false,
    error: null,
    onClose: vi.fn(),
    onRetry: vi.fn(),
    onEnsureLoaded: vi.fn(),
  };

  it('renders nothing when countyFips is null', () => {
    const { container } = render(<DetailPanel {...defaultProps} countyFips={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the county name and state', () => {
    render(<DetailPanel {...defaultProps} />);
    expect(screen.getByText('Autauga County, AL')).toBeInTheDocument();
  });

  it('shows skeleton placeholders when loading', () => {
    render(<DetailPanel {...defaultProps} demographics={null} loading={true} />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows error message with retry button on failure', () => {
    render(
      <DetailPanel {...defaultProps} demographics={null} loading={false} error="Network error" />
    );
    expect(screen.getByTestId('detail-error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders KPI cards and charts when data is loaded', () => {
    render(<DetailPanel {...defaultProps} />);
    expect(screen.getByTestId('kpi-cards')).toBeInTheDocument();
    expect(screen.getByTestId('age-chart')).toBeInTheDocument();
    expect(screen.getByTestId('income-chart')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-chart')).toBeInTheDocument();
  });
});
