import { useState, useCallback, useRef } from 'react';
import type { AllCountyDemographics, CountyDemographics } from '@/types';

interface CountyDataState {
  data: AllCountyDemographics | null;
  loading: boolean;
  error: string | null;
}

export function useCountyData() {
  const [state, setState] = useState<CountyDataState>({
    data: null,
    loading: false,
    error: null,
  });
  const fetchedRef = useRef(false);
  const promiseRef = useRef<Promise<AllCountyDemographics> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const ensureLoaded = useCallback(async (): Promise<AllCountyDemographics | null> => {
    // Already loaded
    if (stateRef.current.data) return stateRef.current.data;

    // Already fetching — wait for the existing promise
    if (promiseRef.current) return promiseRef.current;

    // Already failed once — don't retry automatically
    if (fetchedRef.current && stateRef.current.error) return null;

    fetchedRef.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const promise = fetch('/data/demographics/counties.json').then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load demographics: ${res.status}`);
      return (await res.json()) as AllCountyDemographics;
    });

    promiseRef.current = promise;

    try {
      const data = await promise;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load demographics';
      setState({ data: null, loading: false, error: message });
      promiseRef.current = null;
      return null;
    }
  }, []);

  const lookupByFips = useCallback(
    (fips: string): CountyDemographics | null => {
      if (!state.data) return null;
      return state.data[fips] ?? null;
    },
    [state.data],
  );

  const retry = useCallback(() => {
    fetchedRef.current = false;
    promiseRef.current = null;
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    demographics: state.data,
    loading: state.loading,
    error: state.error,
    ensureLoaded,
    lookupByFips,
    retry,
  };
}
