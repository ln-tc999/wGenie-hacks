# FSN-0018: Implement Vault Activity Tab

## Overview

Implement the activity tab on vault detail pages (`/vaults/:chainId/:address/activity`) by reusing the existing global activity page components, scoped to a single vault.

## Current State Analysis

- **Global activity page** (`/activity`) has a fully working activity table with infinite scroll, filters, and TotalInflows component
- **Vault activity page** (`/vaults/[chainId]/[address]/activity/page.tsx`) is a placeholder showing "Coming soon"
- **API route** (`/api/activity`) already supports filtering by `chains` and `vaults` query params
- **Vault layout** already provides `AppProviders` and `VaultProvider` context with `chainId` and `vaultAddress`
- **Existing fetch functions** (`fetchActivity`, `fetchActivityInflows`) accept filter params that can scope to a single vault

### Key Discoveries:
- `fetch-activity.ts:112` - `fetchActivity()` accepts `ActivitySearchParams` with `chains` and `vaults` fields
- `fetch-activity.ts:279` - `fetchActivityInflows()` accepts `chains` param but NOT vault-specific filtering (needs extension)
- `fetch-activity-client.ts:42` - Client fetch passes params including `vaults` to `/api/activity`
- `activity-filter-bar.tsx` - Contains Network and Vault filters that aren't needed for vault-scoped view
- `vault-detail-layout.tsx:25` - Layout already wraps children in `AppProviders` + `VaultProvider`
- `use-infinite-activity.ts:22` - Infinite query uses `['activity', params]` as query key, so different params = different cache

## Desired End State

The vault activity page at `/vaults/:chainId/:address/activity` shows:
1. A TotalInflows component showing 1D/7D/30D net flows for this specific vault
2. A simplified filter bar with only: Activity Type, Min Amount, Depositor Address (no Network/Vault filters since those are implicit)
3. The activity data table showing only deposits/withdrawals for this vault
4. Infinite scroll for loading more activity

## What We're NOT Doing

- Not creating a separate API route for vault activity (reuse existing `/api/activity`)
- Not duplicating the activity data table or column components
- Not adding any new database queries or tables
- Not modifying the global activity page

## Implementation Approach

Reuse the existing activity infrastructure with minimal new code:
- Create a vault-scoped version of the filter bar (subset of filters)
- Create a vault activity content component that wires up the existing table + infinite scroll
- Extend `fetchActivityInflows` to support vault-specific filtering
- Server-side fetch initial data scoped to the vault, pass to client components

## Phase 1: Extend Server-Side Inflows to Support Vault Filtering

### Overview
The `fetchActivityInflows` function currently only filters by chain. We need to add vault address filtering so TotalInflows shows vault-specific data.

### Changes Required:

#### 1. Extend `fetchActivityInflows` in `fetch-activity.ts`

**File**: `packages/web/src/activity/fetch-activity.ts`
**Changes**: Add optional `vaults` parameter to `fetchActivityInflows`

```typescript
export async function fetchActivityInflows(
  chains?: string,
  vaults?: string  // Add this parameter
): Promise<InflowsResponse> {
  const chainIds = chains
    ? chains.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !isNaN(c))
    : null;
  const vaultAddresses = vaults
    ? vaults.split(',').map((v) => v.trim().toLowerCase())
    : null;

  // ... existing time calculations ...

  const fetchDepositSum = async (sinceTimestamp: number): Promise<bigint> => {
    let q = supabase
      .from('deposit_event')
      .select('assets')
      .gte('timestamp', sinceTimestamp);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);  // Add this

    const { data } = await q;
    return data?.reduce((acc, r) => acc + BigInt(r.assets), 0n) ?? 0n;
  };

  const fetchWithdrawSum = async (sinceTimestamp: number): Promise<bigint> => {
    let q = supabase
      .from('withdrawal_event')
      .select('assets')
      .gte('timestamp', sinceTimestamp);

    if (chainIds) q = q.in('chain_id', chainIds);
    if (vaultAddresses) q = q.in('vault_address', vaultAddresses);  // Add this

    const { data } = await q;
    return data?.reduce((acc, r) => acc + BigInt(r.assets), 0n) ?? 0n;
  };

  // ... rest unchanged ...
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Existing global activity page still works (no breaking changes to the function signature since new param is optional)

#### Manual Verification:
- [ ] N/A for this phase alone

---

## Phase 2: Create Vault Activity Content Component

### Overview
Create the vault-specific activity content component that uses the existing table and infinite scroll, but with a simplified filter bar (no Network/Vault dropdowns).

### Changes Required:

#### 1. Create Vault Activity Filter Bar

**File**: `packages/web/src/vault-details/components/vault-activity-filter-bar.tsx`
**Changes**: New file - simplified filter bar with only Type, Min Amount, and Depositor filters

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Props {
  searchParams: { type?: string; min_amount?: string; depositor?: string };
}

export function VaultActivityFilterBar({ searchParams }: Props) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [depositorInput, setDepositorInput] = useState(searchParams.depositor || '');

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const currentType = searchParams.type || 'all';
  const currentMinAmount = searchParams.min_amount || 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Activity Type Filter */}
      <Select value={currentType} onValueChange={(v) => updateFilters({ type: v === 'all' ? null : v })} disabled={isPending}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Activity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Activity</SelectItem>
          <SelectItem value="deposit">Deposits</SelectItem>
          <SelectItem value="withdraw">Withdrawals</SelectItem>
        </SelectContent>
      </Select>

      {/* Min Amount Filter */}
      <ToggleGroup type="single" variant="outline" value={currentMinAmount} onValueChange={(v) => updateFilters({ min_amount: v || 'all' === 'all' ? null : v })} disabled={isPending}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="100">&gt;$100</ToggleGroupItem>
        <ToggleGroupItem value="1000">&gt;$1K</ToggleGroupItem>
        <ToggleGroupItem value="10000">&gt;$10K</ToggleGroupItem>
      </ToggleGroup>

      {/* Depositor Address Input */}
      <form onSubmit={(e) => { e.preventDefault(); updateFilters({ depositor: depositorInput.trim() || null }); }} className="flex-1 min-w-[200px] max-w-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Paste Wallet Address" value={depositorInput} onChange={(e) => setDepositorInput(e.target.value)} className="pl-9" disabled={isPending} />
        </div>
      </form>
    </div>
  );
}
```

#### 2. Create Vault Activity Content Component

**File**: `packages/web/src/vault-details/components/vault-activity-content.tsx`
**Changes**: New file - wires up the activity table with vault-scoped data

```typescript
'use client';

import { useMemo, useCallback } from 'react';
import { ActivityDataTable } from '@/activity/components/activity-data-table';
import { ActivityScrollTrigger } from '@/activity/components/activity-scroll-trigger';
import { TotalInflows } from '@/activity/components/total-inflows';
import { VaultActivityFilterBar } from './vault-activity-filter-bar';
import { useInfiniteActivity } from '@/activity/hooks/use-infinite-activity';
import type { ActivityItem, InflowsResponse, ActivitySearchParams } from '@/activity/fetch-activity';

interface Props {
  activities: ActivityItem[];
  inflows: InflowsResponse;
  searchParams: ActivitySearchParams;
  hasMore: boolean;
  nextCursor: string | null;
}

export function VaultActivityContent({
  activities: initialActivities,
  inflows,
  searchParams,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
}: Props) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivity({
    params: searchParams,
    initialData: {
      activities: initialActivities,
      pagination: {
        nextCursor: initialNextCursor,
        hasMore: initialHasMore,
      },
    },
  });

  const allActivities = useMemo(() => {
    if (!data) return initialActivities;
    return data.pages.flatMap((page) => page.activities);
  }, [data, initialActivities]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="space-y-4">
      {/* Header with TotalInflows */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <VaultActivityFilterBar searchParams={searchParams} />
        <TotalInflows inflows={inflows.inflows} />
      </div>

      {/* Activity Table */}
      <ActivityDataTable activities={allActivities} />

      {/* Infinite Scroll Trigger */}
      <ActivityScrollTrigger
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage ?? false}
        isLoading={isFetchingNextPage}
      />
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`

#### Manual Verification:
- [ ] Components render correctly (tested in Phase 3)

---

## Phase 3: Wire Up Vault Activity Page

### Overview
Replace the placeholder vault activity page with server-side data fetching and the new vault activity content component.

### Changes Required:

#### 1. Update Vault Activity Page

**File**: `packages/web/src/app/vaults/[chainId]/[address]/activity/page.tsx`
**Changes**: Replace placeholder with server-side data fetching

```typescript
import { type Address } from 'viem';
import {
  fetchActivity,
  fetchActivityInflows,
  type ActivitySearchParams,
} from '@/activity/fetch-activity';
import { VaultActivityContent } from '@/vault-details/components/vault-activity-content';

export const metadata = {
  title: 'Vault Activity - Fusion by wGenie',
};

interface PageProps {
  params: Promise<{
    chainId: string;
    address: string;
  }>;
  searchParams: Promise<{ type?: string; min_amount?: string; depositor?: string }>;
}

export default async function VaultActivityPage({ params, searchParams }: PageProps) {
  const { chainId: chainIdParam, address } = await params;
  const search = await searchParams;

  const chainId = chainIdParam;
  const vaultAddress = address.toLowerCase();

  // Build activity search params scoped to this vault
  const activityParams: ActivitySearchParams = {
    chains: chainId,
    vaults: vaultAddress,
    type: search.type,
    min_amount: search.min_amount,
    depositor: search.depositor,
  };

  try {
    const [activityData, inflowsData] = await Promise.all([
      fetchActivity(activityParams),
      fetchActivityInflows(chainId, vaultAddress),
    ]);

    return (
      <VaultActivityContent
        activities={activityData.activities}
        inflows={inflowsData}
        searchParams={activityParams}
        hasMore={activityData.pagination.hasMore}
        nextCursor={activityData.pagination.nextCursor}
      />
    );
  } catch {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Unable to load activity data. Please try again.
        </p>
      </div>
    );
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/web typecheck`
- [ ] Dev server starts without errors: `pnpm --filter @wgenie/web dev`

#### Manual Verification:
- [ ] Navigate to `http://localhost:3000/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/activity`
- [ ] Activity table shows deposits and withdrawals for this vault only
- [ ] TotalInflows shows vault-specific 1D/7D/30D net flows
- [ ] Activity Type filter works (Deposits / Withdrawals / All)
- [ ] Min Amount filter works (All / >$100 / >$1K / >$10K)
- [ ] Depositor Address search works
- [ ] Infinite scroll loads more data
- [ ] Global activity page at `/activity` still works as before

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Manual Testing Steps:
1. Navigate to a vault activity page (e.g., `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/activity`)
2. Verify the activity table shows data
3. Verify TotalInflows shows non-zero values
4. Test each filter individually
5. Test infinite scroll by scrolling to bottom
6. Navigate to global `/activity` page and verify it still works
7. Test multiple vaults to ensure data is correctly scoped

## Performance Considerations

- Server-side initial data fetch avoids client-side loading spinner on first paint
- `useInfiniteActivity` hook already handles caching with 30s stale time
- Vault-scoped queries should be faster than global queries (fewer rows to scan)
- Supabase queries filter by `vault_address` which should leverage existing indices

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0018-implement-activity-tab-vault-page.md`
- Global activity page: `packages/web/src/app/activity/page.tsx`
- Activity fetch logic: `packages/web/src/activity/fetch-activity.ts`
- Vault detail layout: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`
