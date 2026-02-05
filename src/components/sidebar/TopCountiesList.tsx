import type { CountyScore } from '@/types';

interface TopCountiesListProps {
  counties: CountyScore[];
  loading?: boolean;
}

export function TopCountiesList({ counties, loading }: TopCountiesListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground">
          Top Counties
        </h3>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (counties.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground">
          Top Counties
        </h3>
        <p className="text-sm text-muted-foreground">No results</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">
        Top 10 Counties
      </h3>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-1.5 text-left font-medium">#</th>
              <th className="px-2 py-1.5 text-left font-medium">County</th>
              <th className="px-2 py-1.5 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {counties.map((county, index) => (
              <tr
                key={county.fips}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-2 py-1.5 text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-2 py-1.5">
                  {county.name}, {county.state}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {Math.round(county.score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
