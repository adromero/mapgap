import { renderHook, act } from '@testing-library/react';
import { useCountyData } from '../useCountyData';
import type { AllCountyDemographics } from '@/types';

const MOCK_DEMOGRAPHICS: AllCountyDemographics = {
  '12011': {
    fips: '12011',
    name: 'Broward County',
    state: 'FL',
    population: 1944375,
    medianIncome: 55000,
    medianAge: 40.2,
    householdSize: 2.6,
    populationGrowth: 1.2,
    ageDistribution: { under18: 21, age18to34: 22, age35to54: 27, age55to74: 22, age75plus: 8 },
    incomeDistribution: { under25k: 18, income25kTo50k: 22, income50kTo75k: 20, income75kTo100k: 16, over100k: 24 },
    stateAverages: { medianIncome: 57703, medianAge: 42.2, populationPerSqMi: 401.4 },
  },
  '48201': {
    fips: '48201',
    name: 'Harris County',
    state: 'TX',
    population: 4731145,
    medianIncome: 52000,
    medianAge: 33.5,
    householdSize: 2.8,
    populationGrowth: 2.1,
    ageDistribution: { under18: 26, age18to34: 24, age35to54: 28, age55to74: 16, age75plus: 6 },
    incomeDistribution: { under25k: 20, income25kTo50k: 23, income50kTo75k: 21, income75kTo100k: 15, over100k: 21 },
    stateAverages: { medianIncome: 61874, medianAge: 34.8, populationPerSqMi: 110 },
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MOCK_DEMOGRAPHICS),
    }),
  ));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCountyData', () => {
  it('starts with no data loaded', () => {
    const { result } = renderHook(() => useCountyData());
    expect(result.current.demographics).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads demographics lazily on ensureLoaded call', async () => {
    const { result } = renderHook(() => useCountyData());

    await act(async () => {
      await result.current.ensureLoaded();
    });

    expect(result.current.demographics).not.toBeNull();
    expect(result.current.loading).toBe(false);
    expect(Object.keys(result.current.demographics!)).toHaveLength(2);
  });

  it('provides lookup by FIPS code', async () => {
    const { result } = renderHook(() => useCountyData());

    await act(async () => {
      await result.current.ensureLoaded();
    });

    const broward = result.current.lookupByFips('12011');
    expect(broward).not.toBeNull();
    expect(broward!.name).toBe('Broward County');
    expect(broward!.population).toBe(1944375);

    const missing = result.current.lookupByFips('99999');
    expect(missing).toBeNull();
  });

  it('handles fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 }),
    ));

    const { result } = renderHook(() => useCountyData());

    await act(async () => {
      await result.current.ensureLoaded();
    });

    expect(result.current.demographics).toBeNull();
    expect(result.current.error).toBe('Failed to load demographics: 500');
  });

  it('allows retry after failure', async () => {
    let shouldFail = true;
    vi.stubGlobal('fetch', vi.fn(() => {
      if (shouldFail) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_DEMOGRAPHICS),
      });
    }));

    const { result } = renderHook(() => useCountyData());

    await act(async () => {
      await result.current.ensureLoaded();
    });
    expect(result.current.error).not.toBeNull();

    shouldFail = false;
    act(() => result.current.retry());

    await act(async () => {
      await result.current.ensureLoaded();
    });

    expect(result.current.demographics).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
