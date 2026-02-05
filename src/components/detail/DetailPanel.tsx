import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KPICards } from './KPICards';
import { AgeChart } from './AgeChart';
import { IncomeChart } from './IncomeChart';
import { ComparisonChart } from './ComparisonChart';
import type { CountyDemographics, CountyScore } from '@/types';

interface DetailPanelProps {
  countyFips: string | null;
  countyScore: CountyScore | null;
  demographics: CountyDemographics | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onEnsureLoaded: () => void;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className ?? ''}`}
      data-testid="skeleton"
    />
  );
}

function SkeletonKPIs() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3">
          <SkeletonBlock className="mb-2 h-3 w-20" />
          <SkeletonBlock className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <SkeletonBlock className="mb-2 h-4 w-32" />
          <SkeletonBlock className="h-[200px] w-full" />
        </div>
      ))}
    </div>
  );
}

export function DetailPanel({
  countyFips,
  countyScore,
  demographics,
  loading,
  error,
  onClose,
  onRetry,
  onEnsureLoaded,
}: DetailPanelProps) {
  const onEnsureLoadedRef = useRef(onEnsureLoaded);
  onEnsureLoadedRef.current = onEnsureLoaded;

  useEffect(() => {
    if (countyFips) {
      onEnsureLoadedRef.current();
    }
  }, [countyFips]);

  if (!countyFips) return null;

  const countyName = demographics?.name ?? countyScore?.name ?? 'Unknown County';
  const stateAbbr = demographics?.state ?? countyScore?.state ?? '';

  return (
    <div
      className="animate-in slide-in-from-bottom-4 border-t bg-background p-4"
      data-testid="detail-panel"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {countyName}{stateAbbr ? `, ${stateAbbr}` : ''}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded border border-destructive/50 bg-destructive/10 p-3 text-sm" data-testid="detail-error">
          <span className="text-destructive">Failed to load demographics: {error}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}

      {loading && !error && (
        <div className="space-y-4">
          <SkeletonKPIs />
          <SkeletonCharts />
        </div>
      )}

      {demographics && countyScore && !loading && !error && (
        <div className="space-y-4">
          <KPICards
            score={countyScore.score}
            establishmentCount={countyScore.establishmentCount}
            population={demographics.population}
            medianIncome={demographics.medianIncome}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <AgeChart data={demographics.ageDistribution} />
            <IncomeChart data={demographics.incomeDistribution} />
            <ComparisonChart
              countyIncome={demographics.medianIncome}
              countyAge={demographics.medianAge}
              stateAverages={demographics.stateAverages}
              countyName={countyName}
            />
          </div>
        </div>
      )}
    </div>
  );
}