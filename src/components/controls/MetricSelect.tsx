import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type MetricKey = 'score' | 'establishmentCount' | 'populationPerBiz';

interface MetricSelectProps {
  value: MetricKey;
  onChange: (value: MetricKey) => void;
}

const METRICS: { value: MetricKey; label: string }[] = [
  { value: 'score', label: 'Opportunity Score' },
  { value: 'establishmentCount', label: 'Establishment Count' },
  { value: 'populationPerBiz', label: 'Population per Business' },
];

export function MetricSelect({ value, onChange }: MetricSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Metric
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as MetricKey)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METRICS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
