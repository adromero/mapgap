import { renderHook, waitFor } from '@testing-library/react';
import { useIndustryData } from '../useIndustryData';
import type { Industry, IndustryScores } from '@/types';

const MOCK_INDUSTRIES: Industry[] = [
  { id: 'coffee-shops', label: 'Coffee Shops', naicsCodes: ['722515'], description: 'Coffee & snack bars' },
  { id: 'gyms', label: 'Gyms & Fitness', naicsCodes: ['713940'], description: 'Fitness centers' },
];

const MOCK_SCORES: IndustryScores = {
  '12011': { fips: '12011', name: 'Broward County', state: 'FL', score: 82, establishmentCount: 93, populationPerBiz: 49876 },
  '48201': { fips: '48201', name: 'Harris County', state: 'TX', score: 91, establishmentCount: 45, populationPerBiz: 102000 },
  '06037': { fips: '06037', name: 'Los Angeles County', state: 'CA', score: 55, establishmentCount: 200, populationPerBiz: 50000 },
  '48113': { fips: '48113', name: 'Dallas County', state: 'TX', score: 73, establishmentCount: 60, populationPerBiz: 43000 },
};

let fetchCallCount = 0;

beforeEach(() => {
  fetchCallCount = 0;
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    fetchCallCount++;
    if (url.includes('industries.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_INDUSTRIES),
      });
    }
    if (url.includes('scores/coffee-shops.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_SCORES),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIndustryData', () => {
  it('loads the industries list on mount', async () => {
    const { result } = renderHook(() => useIndustryData(null, null));
    expect(result.current.industriesLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.industriesLoading).toBe(false);
    });

    expect(result.current.industries).toHaveLength(2);
    expect(result.current.industriesError).toBeNull();
  });

  it('rejects unknown industry IDs', async () => {
    const { result } = renderHook(() => useIndustryData('unknown-industry', null));

    await waitFor(() => {
      expect(result.current.industriesLoading).toBe(false);
    });

    expect(result.current.scoresError).toBe('Unknown industry ID: unknown-industry');
    expect(result.current.scores).toBeNull();
  });

  it('validates industry IDs against the loaded list', async () => {
    const { result } = renderHook(() => useIndustryData(null, null));

    await waitFor(() => {
      expect(result.current.industriesLoading).toBe(false);
    });

    expect(result.current.isValidIndustryId('coffee-shops')).toBe(true);
    expect(result.current.isValidIndustryId('gyms')).toBe(true);
    expect(result.current.isValidIndustryId('nonexistent')).toBe(false);
  });

  it('loads score data for a valid industry', async () => {
    const { result } = renderHook(() => useIndustryData('coffee-shops', null));

    await waitFor(() => {
      expect(result.current.scores).not.toBeNull();
    });

    expect(result.current.scoresError).toBeNull();
    expect(result.current.scores!['12011'].name).toBe('Broward County');
    expect(result.current.scores!['48201'].score).toBe(91);
  });

  it('parses score data correctly', async () => {
    const { result } = renderHook(() => useIndustryData('coffee-shops', null));

    await waitFor(() => {
      expect(result.current.scores).not.toBeNull();
    });

    const broward = result.current.scores!['12011'];
    expect(broward.fips).toBe('12011');
    expect(broward.name).toBe('Broward County');
    expect(broward.state).toBe('FL');
    expect(broward.score).toBe(82);
    expect(broward.establishmentCount).toBe(93);
    expect(broward.populationPerBiz).toBe(49876);
  });

  it('caches score data and does not re-fetch', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useIndustryData(id, null),
      { initialProps: { id: 'coffee-shops' as string | null } },
    );

    await waitFor(() => {
      expect(result.current.scores).not.toBeNull();
    });

    // fetch called for industries.json + coffee-shops.json
    const callsAfterFirst = fetchCallCount;

    // Switch away and back
    rerender({ id: null });
    await waitFor(() => {
      expect(result.current.scores).toBeNull();
    });

    rerender({ id: 'coffee-shops' });
    await waitFor(() => {
      expect(result.current.scores).not.toBeNull();
    });

    // No additional fetch for coffee-shops.json (cached)
    expect(fetchCallCount).toBe(callsAfterFirst);
  });

  it('returns top 10 counties sorted by score descending', async () => {
    const { result } = renderHook(() => useIndustryData('coffee-shops', null));

    await waitFor(() => {
      expect(result.current.topCounties.length).toBeGreaterThan(0);
    });

    const scores = result.current.topCounties.map((c) => c.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
    expect(result.current.topCounties[0].fips).toBe('48201'); // score 91 is highest
  });

  it('filters scores by state', async () => {
    const { result } = renderHook(() => useIndustryData('coffee-shops', 'TX'));

    await waitFor(() => {
      expect(result.current.scores).not.toBeNull();
    });

    const fipsList = Object.keys(result.current.scores!);
    expect(fipsList).toContain('48201');
    expect(fipsList).toContain('48113');
    expect(fipsList).not.toContain('12011'); // FL
    expect(fipsList).not.toContain('06037'); // CA
  });

  it('state filter narrows top counties results', async () => {
    const { result: allResult } = renderHook(() => useIndustryData('coffee-shops', null));
    const { result: txResult } = renderHook(() => useIndustryData('coffee-shops', 'TX'));

    await waitFor(() => {
      expect(allResult.current.topCounties.length).toBeGreaterThan(0);
      expect(txResult.current.topCounties.length).toBeGreaterThan(0);
    });

    expect(txResult.current.topCounties.length).toBeLessThan(allResult.current.topCounties.length);
    txResult.current.topCounties.forEach((c) => {
      expect(c.state).toBe('TX');
    });
  });

  it('handles industry list load failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ));

    const { result } = renderHook(() => useIndustryData(null, null));

    await waitFor(() => {
      expect(result.current.industriesLoading).toBe(false);
    });

    expect(result.current.industriesError).toBe('Failed to load industries: 500');
  });

  it('handles score file load failure', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('industries.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_INDUSTRIES),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }));

    const { result } = renderHook(() => useIndustryData('coffee-shops', null));

    await waitFor(() => {
      expect(result.current.scoresError).not.toBeNull();
    });

    expect(result.current.scoresError).toBe('Failed to load scores: 404');
  });
});
