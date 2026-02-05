import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapErrorBoundary } from '../MapErrorBoundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <span>child content</span>;
}

describe('MapErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <MapErrorBoundary>
        <span>map content</span>
      </MapErrorBoundary>
    );
    expect(screen.getByText('map content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>
    );
    expect(screen.getByText('Failed to load map.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('does not render children when in error state', () => {
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>
    );
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
  });

  it('logs error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>
    );
    // React calls console.error for the boundary, and componentDidCatch logs too
    expect(consoleErrorSpy).toHaveBeenCalled();
    const mapViewCall = consoleErrorSpy.mock.calls.find(
      (call) => call[0] === 'MapView error:'
    );
    expect(mapViewCall).toBeDefined();
    expect(mapViewCall![1]).toBeInstanceOf(Error);
    expect(mapViewCall![1].message).toBe('Test error');
  });

  it('recovers when retry is clicked and child no longer throws', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </MapErrorBoundary>
    );
    expect(screen.getByText('Failed to load map.')).toBeInTheDocument();

    // Rerender with a non-throwing child before clicking retry
    rerender(
      <MapErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </MapErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load map.')).not.toBeInTheDocument();
  });
});
