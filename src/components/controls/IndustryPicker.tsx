import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Industry } from '@/types';

interface IndustryPickerProps {
  industries: Industry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}

export function IndustryPicker({
  industries,
  selectedId,
  onSelect,
  loading,
}: IndustryPickerProps) {
  const [open, setOpen] = useState(false);

  const selected = industries.find((i) => i.id === selectedId);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Industry
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={loading}
          >
            {loading
              ? 'Loading...'
              : selected
                ? selected.label
                : 'Select industry...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[248px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search industries..." />
            <CommandList>
              <CommandEmpty>No industry found.</CommandEmpty>
              <CommandGroup>
                {industries.map((industry) => (
                  <CommandItem
                    key={industry.id}
                    value={industry.label}
                    onSelect={() => {
                      onSelect(
                        industry.id === selectedId ? null : industry.id,
                      );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedId === industry.id
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    {industry.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
