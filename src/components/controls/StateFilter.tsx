import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { stateList } from '@/data/stateList';

interface StateFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function StateFilter({ value, onChange }: StateFilterProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        State
      </label>
      <Select
        value={value ?? 'all'}
        onValueChange={(v) => onChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          {stateList.map((s) => (
            <SelectItem key={s.abbreviation} value={s.abbreviation}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
