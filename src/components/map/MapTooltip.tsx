import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import type { IndustryScores } from '@/types';

interface TooltipState {
  x: number;
  y: number;
  countyName: string;
  stateName: string;
  score: number | null;
}

interface MapTooltipProps {
  map: MaplibreMap | null;
  scores: IndustryScores | null;
  layerId: string;
}

export function MapTooltip({ map, scores, layerId }: MapTooltipProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const rafRef = useRef<number | null>(null);
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  useEffect(() => {
    if (!map) return;

    function handleMouseMove(e: MapLayerMouseEvent) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const feature = e.features?.[0];
        if (!feature) {
          setTooltip(null);
          return;
        }

        const fips = feature.properties?.GEOID as string | undefined;
        const name = feature.properties?.NAME as string | undefined;

        if (!fips || !name) {
          setTooltip(null);
          return;
        }

        const scoreEntry = scoresRef.current?.[fips];
        setTooltip({
          x: e.point.x,
          y: e.point.y,
          countyName: name,
          stateName: scoreEntry?.state ?? '',
          score: scoreEntry?.score ?? null,
        });
      });
    }

    function handleMouseLeave() {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setTooltip(null);
    }

    map.on('mousemove', layerId, handleMouseMove);
    map.on('mouseleave', layerId, handleMouseLeave);

    return () => {
      map.off('mousemove', layerId, handleMouseMove);
      map.off('mouseleave', layerId, handleMouseLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [map, layerId]);

  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
      style={{ left: tooltip.x + 12, top: tooltip.y - 12 }}
      data-testid="map-tooltip"
    >
      <p className="font-medium">
        {tooltip.countyName}
        {tooltip.stateName ? `, ${tooltip.stateName}` : ''}
      </p>
      {tooltip.score !== null ? (
        <p className="text-muted-foreground">
          Score: <span className="font-semibold text-foreground">{tooltip.score}</span>
        </p>
      ) : (
        <p className="text-muted-foreground">No data available</p>
      )}
    </div>
  );
}
