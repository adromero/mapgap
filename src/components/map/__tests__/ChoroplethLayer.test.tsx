import { render } from '@testing-library/react';
import { ChoroplethLayer, buildFillColorExpression } from '../ChoroplethLayer';
import type { IndustryScores } from '@/types';
import { choroplethScale } from '@/data/colorScales';

function createMockMap(sourceExists = false) {
  return {
    getSource: vi.fn(() => (sourceExists ? { type: 'geojson' } : null)),
    getLayer: vi.fn(() => null),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setPaintProperty: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('ChoroplethLayer', () => {
  it('renders without crashing (returns null)', () => {
    const map = createMockMap();
    const { container } = render(
      <ChoroplethLayer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map={map as any}
        scores={null}
        geojsonStatus="loaded"
        onGeojsonStatusChange={vi.fn()}
        onCountyClick={vi.fn()}
      />,
    );
    // ChoroplethLayer renders null — no DOM output
    expect(container.innerHTML).toBe('');
  });

  it('triggers GeoJSON load when status is loading', () => {
    const map = createMockMap();
    const onStatusChange = vi.fn();

    // Stub fetch to return geojson
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
    }));

    render(
      <ChoroplethLayer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map={map as any}
        scores={null}
        geojsonStatus="loading"
        onGeojsonStatusChange={onStatusChange}
        onCountyClick={vi.fn()}
      />,
    );

    // fetch should have been called with the geojson URL
    expect(fetch).toHaveBeenCalledWith('/data/counties.geojson');

    vi.unstubAllGlobals();
  });

  it('marks loaded immediately if source already exists', () => {
    const map = createMockMap(true);
    const onStatusChange = vi.fn();

    render(
      <ChoroplethLayer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map={map as any}
        scores={null}
        geojsonStatus="loading"
        onGeojsonStatusChange={onStatusChange}
        onCountyClick={vi.fn()}
      />,
    );

    expect(onStatusChange).toHaveBeenCalledWith('loaded');
  });
});

function makeCountyScore(overrides: Partial<import('@/types').CountyScore> & { fips: string; score: number }): import('@/types').CountyScore {
  return {
    name: 'Test County',
    state: 'TX',
    establishmentCount: 10,
    populationPerBiz: 500,
    ...overrides,
  };
}

describe('buildFillColorExpression', () => {
  it('handles empty scores object', () => {
    const scores: IndustryScores = {};
    const result = buildFillColorExpression(scores, 'score');

    // Should produce a valid interpolate expression with no fips pairs
    expect(result[0]).toBe('interpolate');
    expect(result[1]).toEqual(['linear']);

    // The match expression should have only the default fallback (0)
    const matchExpr = result[2] as unknown[];
    expect(matchExpr[0]).toBe('match');
    expect(matchExpr[1]).toEqual(['get', 'GEOID']);
    // With no entries, only default value present: ['match', ['get', 'GEOID'], 0]
    expect(matchExpr.length).toBe(3);
    expect(matchExpr[2]).toBe(0);

    // Color stops should still be present
    expect(result[3]).toBe(choroplethScale[0].value);
    expect(result[4]).toBe(choroplethScale[0].color);
  });

  it('handles a single county', () => {
    const scores: IndustryScores = {
      '48001': makeCountyScore({ fips: '48001', score: 75 }),
    };
    const result = buildFillColorExpression(scores, 'score');

    const matchExpr = result[2] as unknown[];
    // ['match', ['get', 'GEOID'], '48001', 75, 0]
    expect(matchExpr[0]).toBe('match');
    expect(matchExpr[2]).toBe('48001');
    expect(matchExpr[3]).toBe(75);
    expect(matchExpr[4]).toBe(0); // default
  });

  it('handles all counties with the same score', () => {
    const scores: IndustryScores = {
      '48001': makeCountyScore({ fips: '48001', score: 50 }),
      '48002': makeCountyScore({ fips: '48002', score: 50 }),
      '48003': makeCountyScore({ fips: '48003', score: 50 }),
    };
    const result = buildFillColorExpression(scores, 'score');

    const matchExpr = result[2] as unknown[];
    // All scores should be 50 (no normalization for 'score' metric)
    expect(matchExpr[2]).toBe('48001');
    expect(matchExpr[3]).toBe(50);
    expect(matchExpr[4]).toBe('48002');
    expect(matchExpr[5]).toBe(50);
    expect(matchExpr[6]).toBe('48003');
    expect(matchExpr[7]).toBe(50);
  });

  it('handles all same values for a non-score metric (avoids division by zero)', () => {
    const scores: IndustryScores = {
      '48001': makeCountyScore({ fips: '48001', score: 50, populationPerBiz: 200 }),
      '48002': makeCountyScore({ fips: '48002', score: 60, populationPerBiz: 200 }),
    };
    const result = buildFillColorExpression(scores, 'populationPerBiz');

    const matchExpr = result[2] as unknown[];
    // When all values are the same, max is set to min+1, so normalised = ((200-200)/1)*100 = 0
    expect(matchExpr[3]).toBe(0);
    expect(matchExpr[5]).toBe(0);
  });

  it('normalises non-score metrics to 0-100 range', () => {
    const scores: IndustryScores = {
      '48001': makeCountyScore({ fips: '48001', score: 50, establishmentCount: 10 }),
      '48002': makeCountyScore({ fips: '48002', score: 60, establishmentCount: 110 }),
    };
    const result = buildFillColorExpression(scores, 'establishmentCount');

    const matchExpr = result[2] as unknown[];
    // min=10, max=110, range=100
    // 48001: (10-10)/100 * 100 = 0
    // 48002: (110-10)/100 * 100 = 100
    expect(matchExpr[3]).toBe(0);
    expect(matchExpr[5]).toBe(100);
  });
});
