import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { MapView } from '../MapView';

// Mock maplibre-gl since jsdom has no WebGL
vi.mock('maplibre-gl', () => {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  const MockMap = vi.fn().mockImplementation(() => ({
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      // Fire 'load' synchronously for test
      if (event === 'load') {
        setTimeout(() => cb(), 0);
      }
    },
    off: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
    getStyle: vi.fn(() => ({ name: 'Positron' })),
    setStyle: vi.fn(),
    flyTo: vi.fn(),
    getSource: vi.fn(() => null),
    querySourceFeatures: vi.fn(() => []),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(() => null),
    setPaintProperty: vi.fn(),
    _listeners: listeners,
  }));

  return { default: { Map: MockMap } };
});

// Mock maplibre CSS import
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider defaultTheme="light">{ui}</ThemeProvider>);
}

describe('MapView', () => {
  it('renders the map container', () => {
    const { container } = renderWithTheme(<MapView scores={null} />);
    // The outer wrapper div should exist
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading overlay initially', () => {
    renderWithTheme(<MapView scores={null} />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('renders without crashing when scores are provided', () => {
    const scores = {
      '12011': { fips: '12011', name: 'Broward', state: 'FL', score: 75, establishmentCount: 10, populationPerBiz: 5000 },
    };
    const { container } = renderWithTheme(<MapView scores={scores} />);
    expect(container.firstChild).toBeTruthy();
  });
});
