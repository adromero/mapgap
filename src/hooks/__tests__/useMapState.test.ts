import { renderHook, act } from '@testing-library/react';
import { useMapState } from '../useMapState';

describe('useMapState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useMapState());
    expect(result.current.selectedIndustryId).toBeNull();
    expect(result.current.selectedCountyFips).toBeNull();
    expect(result.current.hoveredCountyFips).toBeNull();
    expect(result.current.stateFilter).toBeNull();
    expect(result.current.viewport).toEqual({ center: [-98.5, 39.8], zoom: 4 });
  });

  it('selects an industry', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.selectIndustry('coffee-shops'));
    expect(result.current.selectedIndustryId).toBe('coffee-shops');
  });

  it('selects and clears a county', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.selectCounty('12011'));
    expect(result.current.selectedCountyFips).toBe('12011');
    act(() => result.current.selectCounty(null));
    expect(result.current.selectedCountyFips).toBeNull();
  });

  it('hovers a county', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.hoverCounty('12011'));
    expect(result.current.hoveredCountyFips).toBe('12011');
    act(() => result.current.hoverCounty(null));
    expect(result.current.hoveredCountyFips).toBeNull();
  });

  it('updates viewport', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.updateViewport({ center: [-90, 35], zoom: 6 }));
    expect(result.current.viewport).toEqual({ center: [-90, 35], zoom: 6 });
  });

  it('sets and clears state filter', () => {
    const { result } = renderHook(() => useMapState());
    act(() => result.current.filterByState('TX'));
    expect(result.current.stateFilter).toBe('TX');
    act(() => result.current.filterByState(null));
    expect(result.current.stateFilter).toBeNull();
  });
});
