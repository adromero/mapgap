import { choroplethScale } from '@/data/colorScales';

interface MapLegendProps {
  minLabel?: string;
  maxLabel?: string;
}

export function MapLegend({ minLabel = '0', maxLabel = '100' }: MapLegendProps) {
  const gradientStops = choroplethScale
    .map((stop) => `${stop.color} ${stop.value}%`)
    .join(', ');

  return (
    <div className="flex flex-col gap-1" data-testid="map-legend">
      <p className="text-xs font-medium text-muted-foreground">Opportunity Score</p>
      <div
        className="h-3 w-full rounded-sm"
        style={{ background: `linear-gradient(to right, ${gradientStops})` }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
