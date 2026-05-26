'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TVLRangeFilter } from './filters/tvl-range-filter';
import { DepositorCountFilter } from './filters/depositor-count-filter';
import type { VaultsMetadata } from '@/vault-directory/fetch-vaults';
import type { TVLRange, DepositorRange } from '@/vault-directory/vault-directory.types';

interface Props {
  metadata: VaultsMetadata;
  activeFilterCount: number;
}

export function VaultFilterPopover({ metadata, activeFilterCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Parse current filter values from URL
  const tvlMin = searchParams.get('tvl_min');
  const tvlMax = searchParams.get('tvl_max');
  const depositorsMin = searchParams.get('depositors_min');
  const depositorsMax = searchParams.get('depositors_max');

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    params.delete('page');

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tvl_min');
      params.delete('tvl_max');
      params.delete('depositors_min');
      params.delete('depositors_max');
      params.delete('page');
      router.push(`?${params.toString()}`);
    });
    setOpen(false);
  };

  const handleTVLChange = (range: TVLRange | null) => {
    updateFilters({
      tvl_min: range?.min?.toString() || null,
      tvl_max: range?.max?.toString() || null,
    });
  };

  const handleDepositorChange = (range: DepositorRange | null) => {
    updateFilters({
      depositors_min: range?.min?.toString() || null,
      depositors_max: range?.max?.toString() || null,
    });
  };

  // Convert URL params to filter component values
  const tvlRange: TVLRange | null =
    tvlMin && tvlMax ? { min: Number(tvlMin), max: Number(tvlMax) } : null;

  const depositorRange: DepositorRange | null =
    depositorsMin && depositorsMax
      ? {
          min: Number(depositorsMin),
          max: Number(depositorsMax),
          label: `${depositorsMin} - ${depositorsMax}`,
        }
      : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isPending}>
          <Filter className="h-4 w-4" />
          More filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">More filters</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                disabled={isPending}
              >
                Clear all
              </Button>
            )}
          </div>

          <Separator />

          {/* TVL Range */}
          <div className="space-y-2">
            <Label className="text-sm">TVL Range (USD)</Label>
            <TVLRangeFilter
              value={tvlRange}
              onChange={handleTVLChange}
              max={metadata.ranges.tvl.max}
            />
          </div>

          {/* Depositor Count */}
          <div className="space-y-2">
            <Label className="text-sm">Depositor Count</Label>
            <DepositorCountFilter
              value={depositorRange}
              onChange={handleDepositorChange}
              max={metadata.ranges.depositors.max}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
