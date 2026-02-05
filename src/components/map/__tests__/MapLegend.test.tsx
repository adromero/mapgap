import { render, screen } from '@testing-library/react';
import { MapLegend } from '../MapLegend';

describe('MapLegend', () => {
  it('renders without crashing', () => {
    render(<MapLegend />);
    expect(screen.getByTestId('map-legend')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(<MapLegend />);
    expect(screen.getByText('Opportunity Score')).toBeInTheDocument();
  });

  it('shows default min/max labels', () => {
    render(<MapLegend />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows custom min/max labels', () => {
    render(<MapLegend minLabel="Low" maxLabel="High" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders a gradient bar', () => {
    const { container } = render(<MapLegend />);
    const gradientBar = container.querySelector('[style*="linear-gradient"]');
    expect(gradientBar).not.toBeNull();
  });
});
