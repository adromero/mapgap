import { render, screen } from '@testing-library/react';
import { TopCountiesList } from '../TopCountiesList';
import type { CountyScore } from '@/types';

const mockCounties: CountyScore[] = [
  { fips: '01001', name: 'Autauga', state: 'AL', score: 95.3, establishmentCount: 5, populationPerBiz: 11200 },
  { fips: '06037', name: 'Los Angeles', state: 'CA', score: 82.7, establishmentCount: 120, populationPerBiz: 83000 },
  { fips: '48201', name: 'Harris', state: 'TX', score: 71.1, establishmentCount: 80, populationPerBiz: 58000 },
];

describe('TopCountiesList', () => {
  it('renders loading state with skeleton placeholders', () => {
    const { container } = render(<TopCountiesList counties={[]} loading />);
    expect(screen.getByText('Top Counties')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(5);
  });

  it('renders empty state when no counties', () => {
    render(<TopCountiesList counties={[]} />);
    expect(screen.getByText('Top Counties')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders "Top 10 Counties" title when counties are provided', () => {
    render(<TopCountiesList counties={mockCounties} />);
    expect(screen.getByText('Top 10 Counties')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<TopCountiesList counties={mockCounties} />);
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('County')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('renders county rows with correct data', () => {
    render(<TopCountiesList counties={mockCounties} />);
    expect(screen.getByText('Autauga, AL')).toBeInTheDocument();
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument();
    expect(screen.getByText('Harris, TX')).toBeInTheDocument();
  });

  it('displays rounded scores', () => {
    render(<TopCountiesList counties={mockCounties} />);
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('83')).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
  });

  it('displays correct row indices starting at 1', () => {
    render(<TopCountiesList counties={mockCounties} />);
    const rows = screen.getAllByRole('row');
    // First row is header, then data rows
    expect(rows[1]).toHaveTextContent('1');
    expect(rows[2]).toHaveTextContent('2');
    expect(rows[3]).toHaveTextContent('3');
  });
});
