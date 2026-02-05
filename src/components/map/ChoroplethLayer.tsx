import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap, ExpressionSpecification, MapLayerMouseEvent } from 'maplibre-gl';
import type { IndustryScores } from '@/types';
import type { MetricKey } from '@/components/controls/MetricSelect';
import { choroplethScale } from '@/data/colorScales';

const SOURCE_ID = 'counties';
const FILL_LAYER_ID = 'county-fill';
const LINE_LAYER_ID = 'county-line';
const GEOJSON_URL = '/data/counties.geojson';

const NO_DATA_COLOR = '#e5e7eb';

/** Validates that data is a GeoJSON FeatureCollection with the expected structure for MapLibre. */
function validateGeoJSON(data: unknown): data is GeoJSON.FeatureCollection {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (obj.type !== 'FeatureCollection') return false;
  if (!Array.isArray(obj.features)) return false;
  // Spot-check first feature for required properties
  if (obj.features.length > 0) {
    const first = obj.features[0] as Record<string, unknown>;
    if (first.type !== 'Feature') return false;
    if (typeof first.geometry !== 'object' || first.geometry === null) return false;
    const props = first.properties as Record<string, unknown> | null;
    if (typeof props?.GEOID !== 'string') return false;
  }
  return true;
}

interface ChoroplethLayerProps {
  map: MaplibreMap | null;
  scores: IndustryScores | null;
  metric: MetricKey;
  geojsonStatus: 'loading' | 'loaded' | 'error';
  onGeojsonStatusChange: (status: 'loading' | 'loaded' | 'error') => void;
  onCountyClick?: (fips: string | null) => void;
  onGeojsonLoaded?: (geojson: GeoJSON.FeatureCollection) => void;
  cachedGeojson?: GeoJSON.FeatureCollection | null;
}

function addSourceAndLayers(map: MaplibreMap, geojson: GeoJSON.FeatureCollection) {
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });

  map.addLayer({
    id: FILL_LAYER_ID,
    type: 'fill',
    source: SOURCE_ID,
    paint: {
      'fill-color': NO_DATA_COLOR,
      'fill-opacity': 0.8,
    },
  });

  map.addLayer({
    id: LINE_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    paint: {
      'line-color': '#94a3b8',
      'line-width': 0.3,
    },
  });
}

export function buildFillColorExpression(scores: IndustryScores, metric: MetricKey): ExpressionSpecification {
  const entries = Object.entries(scores);

  // For 'score' the range is always 0–100; for other metrics normalise to 0–100
  let min = 0;
  let max = 100;
  if (metric !== 'score') {
    const values = entries.map(([, e]) => e[metric]);
    min = Infinity;
    max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (max === min) max = min + 1; // avoid division by zero
  }

  // Build pairs of [fips, normalisedValue] for the match expression
  const fipsPairs: (string | number)[] = [];
  for (const [fips, entry] of entries) {
    const raw = entry[metric];
    const normalised = metric === 'score' ? raw : ((raw - min) / (max - min)) * 100;
    fipsPairs.push(fips, normalised);
  }

  // MapLibre's ExpressionSpecification types are too narrow for dynamic match expressions,
  // so we cast through unknown.
  return [
    'interpolate',
    ['linear'],
    ['match', ['get', 'GEOID'], ...fipsPairs, 0],
    choroplethScale[0].value, choroplethScale[0].color,
    choroplethScale[1].value, choroplethScale[1].color,
    choroplethScale[2].value, choroplethScale[2].color,
  ] as unknown as ExpressionSpecification;
}

export function ChoroplethLayer({ map, scores, metric, geojsonStatus, onGeojsonStatusChange, onCountyClick, onGeojsonLoaded, cachedGeojson }: ChoroplethLayerProps) {
  const loadedRef = useRef(false);
  const onCountyClickRef = useRef(onCountyClick);
  onCountyClickRef.current = onCountyClick;

  // Load GeoJSON source and add layers
  useEffect(() => {
    if (!map || geojsonStatus !== 'loading') return;

    // Avoid double-loading if source already exists (e.g. after style switch)
    if (map.getSource(SOURCE_ID)) {
      loadedRef.current = true;
      onGeojsonStatusChange('loaded');
      return;
    }

    // Re-use cached GeoJSON (e.g. after theme switch) instead of re-fetching
    if (cachedGeojson) {
      try {
        addSourceAndLayers(map, cachedGeojson);
        loadedRef.current = true;
        onGeojsonStatusChange('loaded');
        return;
      } catch {
        // If adding source fails (e.g., map style not fully ready),
        // fall through to fetch path which has proper error handling
      }
    }

    let cancelled = false;

    async function loadGeojson() {
      try {
        const res = await fetch(GEOJSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geojson: unknown = await res.json();
        if (cancelled || !map) return;
        if (!validateGeoJSON(geojson)) {
          throw new Error('Invalid GeoJSON: expected a FeatureCollection with GEOID properties');
        }

        addSourceAndLayers(map, geojson);
        loadedRef.current = true;
        onGeojsonLoaded?.(geojson);
        onGeojsonStatusChange('loaded');
      } catch {
        if (!cancelled) {
          onGeojsonStatusChange('error');
        }
      }
    }

    loadGeojson();
    return () => { cancelled = true; };
  }, [map, geojsonStatus, onGeojsonStatusChange, cachedGeojson]);

  // Wire county click handler
  useEffect(() => {
    if (!map || !loadedRef.current) return;

    function handleClick(e: MapLayerMouseEvent) {
      const feature = e.features?.[0];
      const fips = feature?.properties?.GEOID as string | undefined;
      onCountyClickRef.current?.(fips ?? null);
    }

    map.on('click', FILL_LAYER_ID, handleClick);
    return () => {
      map.off('click', FILL_LAYER_ID, handleClick);
    };
  }, [map, geojsonStatus]);

  // Update fill-color when scores change
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    if (!map.getLayer(FILL_LAYER_ID)) return;

    if (!scores || Object.keys(scores).length === 0) {
      map.setPaintProperty(FILL_LAYER_ID, 'fill-color', NO_DATA_COLOR);
      return;
    }

    const expression = buildFillColorExpression(scores, metric);
    map.setPaintProperty(FILL_LAYER_ID, 'fill-color', expression);
  }, [map, scores, metric]);

  return null;
}