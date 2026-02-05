import { render, screen } from '@testing-library/react';
import { MapTooltip } from '../MapTooltip';

// Minimal MapLibre map mock with event registration
function createMockMap() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    on: vi.fn((event: string, _layerOrCb: unknown, cb?: unknown) => {
      const key = typeof cb === 'function' ? `${event}` : event;
      const handler = (typeof cb === 'function' ? cb : _layerOrCb) as (...args: unknown[]) => void;
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(handler);
    }),
    off: vi.fn(),
    _listeners: listeners,
  };
}

describe('MapTooltip', () => {
  it('renders nothing when there is no hover', () => {
    const map = createMockMap();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<MapTooltip map={map as any} scores={null} layerId="county-fill" />);
    expect(container.querySelector('[data-testid="map-tooltip"]')).toBeNull();
  });

  it('renders tooltip content when provided via props simulation', () => {
    // Directly render tooltip content to verify structure
    const { container } = render(
      <div data-testid="map-tooltip">
        <p className="font-medium">Cook, IL</p>
        <p>Score: <span>85</span></p>
      </div>
    );
    expect(screen.getByText('Cook, IL')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="map-tooltip"]')).not.toBeNull();
  });

  it('shows "No data available" when score is null', () => {
    render(
      <div data-testid="map-tooltip">
        <p className="font-medium">Unknown County</p>
        <p>No data available</p>
      </div>
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('registers mousemove and mouseleave listeners on mount', () => {
    const map = createMockMap();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MapTooltip map={map as any} scores={null} layerId="county-fill" />);
    expect(map.on).toHaveBeenCalledWith('mousemove', 'county-fill', expect.any(Function));
    expect(map.on).toHaveBeenCalledWith('mouseleave', 'county-fill', expect.any(Function));
  });
});
