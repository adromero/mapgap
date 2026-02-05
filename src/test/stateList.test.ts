import { describe, it, expect } from 'vitest';
import { stateList } from '@/data/stateList';

describe('stateList', () => {
  it('contains 51 entries (50 states + DC)', () => {
    expect(stateList).toHaveLength(51);
  });

  it('each entry has abbreviation, name, and fips', () => {
    for (const state of stateList) {
      expect(state.abbreviation).toBeTruthy();
      expect(state.name).toBeTruthy();
      expect(state.fips).toBeTruthy();
      expect(state.abbreviation).toHaveLength(2);
      expect(state.fips.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no duplicate abbreviations', () => {
    const abbrs = stateList.map((s) => s.abbreviation);
    expect(new Set(abbrs).size).toBe(stateList.length);
  });

  it('has no duplicate FIPS codes', () => {
    const fips = stateList.map((s) => s.fips);
    expect(new Set(fips).size).toBe(stateList.length);
  });

  it('includes DC', () => {
    const dc = stateList.find((s) => s.abbreviation === 'DC');
    expect(dc).toBeDefined();
    expect(dc?.fips).toBe('11');
  });
});
