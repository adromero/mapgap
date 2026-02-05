import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/components/ThemeProvider';
import { ChoroplethLayer } from './ChoroplethLayer';
import { MapTooltip } from './MapTooltip';
import type { IndustryScores } from '@/types';
import type { MetricKey } from '@/components/controls/MetricSelect';
import { stateList } from '@/data/stateList';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface MapViewProps {
  scores: IndustryScores | null;
  metric: MetricKey;
  onCountyClick?: (fips: string | null) => void;
  stateFilter?: string | null;
}

function resolvedTheme(theme: string): 'light' | 'dark' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  // system
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function MapView({ scores, metric, onCountyClick, stateFilter }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [geojsonStatus, setGeojsonStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const initialThemeRef = useRef(resolvedTheme(theme));

  const retryLoadGeojson = useCallback(() => {
    setGeojsonStatus('loading');
  }, []);

  const handleGeojsonLoaded = useCallback((geojson: GeoJSON.FeatureCollection) => {
    geojsonRef.current = geojson;
  }, []);

  // Initialize map once (theme changes handled by the style-switch effect below)
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialThemeRef.current === 'dark' ? DARK_STYLE : LIGHT_STYLE,
      center: [-98.5, 39.8],
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
    });

    const onLoad = () => {
      if (!cancelled) setMapReady(true);
    };
    map.on('load', onLoad);

    mapRef.current = map;

    return () => {
      cancelled = true;
      map.off('load', onLoad);
      setMapReady(false);
      setGeojsonStatus('loading');
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch basemap style when theme changes (skips the initial mount)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const resolved = resolvedTheme(theme);
    const newStyle = resolved === 'dark' ? DARK_STYLE : LIGHT_STYLE;

    // On first render the map is already created with the correct style,
    // so compare against what the map was initialised with / last set to.
    const currentStyle = map.getStyle();
    const currentName = currentStyle?.name ?? '';
    const isDark = currentName.toLowerCase().includes('dark');
    const wantDark = resolved === 'dark';

    if (isDark === wantDark) return;

    setMapReady(false);
    setGeojsonStatus('loading');
    map.setStyle(newStyle);

    let settled = false;
    const onStyleLoad = () => {
      if (settled) return;
      settled = true;
      setMapReady(true);
    };
    map.once('style.load', onStyleLoad);

    // Fallback timeout in case style.load never fires (e.g., network issues)
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        setMapReady(true);
      }
    }, 5000);

    return () => {
      map.off('style.load', onStyleLoad);
      clearTimeout(timeoutId);
    };
  }, [theme]);

  // Fit bounds when state filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!stateFilter) {
      // Reset to default US view
      map.flyTo({ center: [-98.5, 39.8], zoom: 4 });
      return;
    }

    // Find state FIPS code from abbreviation
    const stateEntry = stateList.find((s) => s.abbreviation === stateFilter);
    if (!stateEntry) return;

    const geojson = geojsonRef.current;
    if (!geojson) return;

    // Filter features from raw GeoJSON to avoid incomplete results from querySourceFeatures
    const features = geojson.features.filter(
      (f) => f.properties?.STATE === stateEntry.fips,
    );

    if (features.length === 0) return;

    // Compute bounding box from matching features
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const feature of features) {
      const geom = feature.geometry;
      if (!geom || geom.type === 'GeometryCollection') continue;
      // Walk all coordinates regardless of geometry type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stack: any[] = [geom.coordinates];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        if (typeof current[0] === 'number') {
          const lng = current[0] as number;
          const lat = current[1] as number;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        } else {
          for (const item of current) {
            stack.push(item);
          }
        }
      }
    }

    if (minLng < maxLng && minLat < maxLat) {
      map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 40, maxZoom: 10 },
      );
    }
  }, [stateFilter, geojsonStatus]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {mapReady && (
        <>
          <ChoroplethLayer
            map={mapRef.current}
            scores={scores}
            metric={metric}
            geojsonStatus={geojsonStatus}
            onGeojsonStatusChange={setGeojsonStatus}
            onCountyClick={onCountyClick}
            onGeojsonLoaded={handleGeojsonLoaded}
            cachedGeojson={geojsonRef.current}
          />
          <MapTooltip
            map={mapRef.current}
            scores={scores}
            layerId="county-fill"
          />
        </>
      )}

      {/* Loading overlay */}
      {geojsonStatus === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading map...</p>
        </div>
      )}

      {/* Error overlay */}
      {geojsonStatus === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60">
          <p className="text-sm text-destructive">Failed to load map data</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={retryLoadGeojson}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}