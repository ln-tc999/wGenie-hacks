# FSN-0024: Dashboard Overall Metrics — Implementation Plan

## Overview

Add protocol-level aggregate metrics to the dashboard page as SSR metric cards displayed above the existing global flow chart. Five key metrics give a quick snapshot of protocol health: Total TVL, Total Vaults, Active Depositors, 7d Net Flow, and 7d Volume.

## Current State Analysis

The dashboard page (`packages/web/src/app/(dashboard)/page.tsx`) renders `DashboardContent`, which is a `'use client'` component that:
1. Wraps everything in `AppProviders`
2. Shows a heading "Dashboard"
3. Renders `GlobalFlowChart` (client-side interactive chart with React Query)

No aggregate metrics are displayed.

### Key Discoveries:
- `fetchAllVaultsRpcData()` at `packages/web/src/lib/rpc/vault-rpc-data.ts:167` returns TVL per vault (cached 10 min)
- `fetchAllAssetPrices()` at `packages/web/src/lib/rpc/asset-prices.ts:61` returns price oracle data for bucket→USD conversion (cached 10 min)
- Unique depositor counting pattern exists at `packages/web/src/depositors/fetch-depositors.ts:77-138` — fetches all active depositors from Supabase, deduplicates in JS via `Map`
- 7d bucket math exists at `packages/web/src/vault-directory/fetch-vaults.ts:120-141` and `packages/web/src/lib/buckets.ts`
- `bucketSumToUsd()` helper at `packages/web/src/app/api/global/flow-chart/route.ts:21-36` handles Supabase BigInt gotcha
- `formatNumberWithSuffix()` at `packages/web/src/lib/format-number-with-suffix.ts` formats `1234567` → `1.23M`
- `VaultMetricsItem` at `packages/web/src/vault-metrics/components/vault-metrics-item.tsx` is the existing Card pattern for metrics display
- Dashboard layout at `packages/web/src/app/(dashboard)/layout.tsx` is `'use client'` (uses `usePathname`) — but server component pages work inside client layouts in Next.js App Router

## Desired End State

The dashboard at `http://localhost:3001/` shows:
1. Title + subtitle
2. **5 metric cards** in a responsive grid (new)
3. Global flow chart (existing)

Metrics rendered server-side (SSR) — no loading spinners, no client-side fetch for metrics.

### Verification:
- Navigate to `http://localhost:3001/` — five metric cards visible above the flow chart
- Cards show real data (not zeros or placeholders)
- Page loads with metrics already rendered (no flash of loading state)
- Responsive: 5 cols on xl, 3 cols on md, 2 cols on sm

## What We're NOT Doing

- No client-side React Query for metrics (SSR only)
- No caching beyond existing RPC cache (10 min TTL)
- No new API routes (server component fetches directly)
- No historical metric comparison (e.g., "TVL was X last week")
- No leaderboard tables (FSN-0025 scope)
- No "Chains" metric card
- No per-chain breakdown

## Implementation Approach

Convert the dashboard from a simple client-component wrapper to an **async server component** that fetches metrics directly, with the flow chart remaining as a separate client component island.

---

## Phase 1: Data Layer

### Overview
Create `fetchDashboardMetrics()` — a server-side function that fetches all 5 metrics in parallel.

### Changes Required:

#### 1. New file: `packages/web/src/dashboard/fetch-dashboard-metrics.ts`

**Purpose**: Server-side data fetching for dashboard metrics.

```typescript
import { formatUnits, type Address } from 'viem';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { ERC4626_VAULTS } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { fetchAllAssetPrices, type AssetPriceInfo } from '@/lib/rpc/asset-prices';
import { getCacheKey } from '@/lib/rpc/cache';
import { BUCKET_SIZE, getBucketId } from '@/lib/buckets';
import { getUnixTime } from 'date-fns';

export interface DashboardMetrics {
  totalTvlUsd: number;
  totalVaults: number;
  activeDepositors: number;
  netFlow7dUsd: number;
  volume7dUsd: number;
}

/**
 * Convert a bucket sum to USD.
 * Supabase may return `sum` as either a string or JS number (scientific notation).
 */
function bucketSumToUsd(
  sum: string | number,
  assetDecimals: number,
  usdPrice: bigint,
  priceDecimals: number,
): number {
  let amountDecimal: number;
  if (typeof sum === 'string') {
    amountDecimal = Number(formatUnits(BigInt(sum), assetDecimals));
  } else {
    amountDecimal = sum / 10 ** assetDecimals;
  }
  const priceDecimal = Number(formatUnits(usdPrice, priceDecimals));
  return amountDecimal * priceDecimal;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const vaults = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address as Address,
  }));

  // 7d bucket range
  const now = getUnixTime(new Date());
  const endBucketId = getBucketId(now, '2_HOURS');
  const startBucketId = endBucketId - 84 * BUCKET_SIZE['2_HOURS'];

  // Fetch all data sources in parallel
  const [rpcDataMap, assetPrices, depositorsResult, depositBuckets, withdrawBuckets] =
    await Promise.all([
      fetchAllVaultsRpcData(vaults),
      fetchAllAssetPrices(),
      supabase
        .from('depositor')
        .select('depositor_address')
        .gt('share_balance', '0'),
      supabase
        .from('deposit_buckets_2_hours')
        .select('vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
      supabase
        .from('withdraw_buckets_2_hours')
        .select('vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
    ]);

  // 1. Total TVL — sum all vault tvlUsd from RPC
  let totalTvlUsd = 0;
  for (const vault of vaults) {
    const rpcKey = getCacheKey(vault.chainId, vault.address);
    const rpcData = rpcDataMap.get(rpcKey);
    if (rpcData) totalTvlUsd += rpcData.tvlUsd;
  }

  // 2. Total vaults
  const totalVaults = ERC4626_VAULTS.length;

  // 3. Unique active depositors (distinct addresses across all vaults)
  const uniqueAddresses = new Set(
    (depositorsResult.data ?? []).map((r) =>
      (r.depositor_address as string).toLowerCase(),
    ),
  );
  const activeDepositors = uniqueAddresses.size;

  // 4 & 5. 7d net flow and volume from buckets
  let totalDepositsUsd = 0;
  let totalWithdrawalsUsd = 0;

  for (const row of depositBuckets.data ?? []) {
    const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
    const priceInfo = assetPrices.get(key);
    if (!priceInfo) continue;
    totalDepositsUsd += bucketSumToUsd(
      row.sum,
      priceInfo.assetDecimals,
      priceInfo.usdPrice,
      priceInfo.priceDecimals,
    );
  }

  for (const row of withdrawBuckets.data ?? []) {
    const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
    const priceInfo = assetPrices.get(key);
    if (!priceInfo) continue;
    totalWithdrawalsUsd += bucketSumToUsd(
      row.sum,
      priceInfo.assetDecimals,
      priceInfo.usdPrice,
      priceInfo.priceDecimals,
    );
  }

  return {
    totalTvlUsd,
    totalVaults,
    activeDepositors,
    netFlow7dUsd: totalDepositsUsd - totalWithdrawalsUsd,
    volume7dUsd: totalDepositsUsd + totalWithdrawalsUsd,
  };
}
```

**Key design decisions:**
- All 5 queries run in parallel via `Promise.all`
- Reuses existing cached functions (`fetchAllVaultsRpcData`, `fetchAllAssetPrices`) — both cached 10 min
- `bucketSumToUsd` is duplicated from `global/flow-chart/route.ts` rather than importing from an API route (server functions shouldn't import from route handlers)
- Depositor deduplication uses lightweight `Set` (only need count, not full aggregation like `fetch-depositors.ts`)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors: `cd packages/web && npx next lint`

#### Manual Verification:
- [ ] N/A — no UI yet, data layer only

**Implementation Note**: Proceed to Phase 2 immediately.

---

## Phase 2: UI Layer

### Overview
Create the dashboard metrics display component and restructure the page for SSR.

### Changes Required:

#### 1. New file: `packages/web/src/dashboard/components/dashboard-metrics.tsx`

**Purpose**: Server component rendering 5 metric cards. No `'use client'` directive.

```typescript
import {
  DollarSignIcon,
  LayersIcon,
  UsersIcon,
  TrendingUpIcon,
  ActivityIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import type { DashboardMetrics as DashboardMetricsData } from '@/dashboard/fetch-dashboard-metrics';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, description, icon }: MetricCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{title}</span>
        {icon}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export const DashboardMetrics = ({
  metrics,
}: {
  metrics: DashboardMetricsData;
}) => {
  const netFlowSign = metrics.netFlow7dUsd >= 0 ? '+' : '';
  const netFlowColor =
    metrics.netFlow7dUsd >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <MetricCard
        title="Total Value Locked"
        value={`$${formatNumberWithSuffix(metrics.totalTvlUsd)}`}
        description="Across all vaults"
        icon={<DollarSignIcon className="h-4 w-4" />}
      />
      <MetricCard
        title="Total Vaults"
        value={metrics.totalVaults.toLocaleString()}
        description="Active plasma vaults"
        icon={<LayersIcon className="h-4 w-4" />}
      />
      <MetricCard
        title="Active Depositors"
        value={metrics.activeDepositors.toLocaleString()}
        description="Unique addresses with position"
        icon={<UsersIcon className="h-4 w-4" />}
      />
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>7d Net Flow</span>
            <TrendingUpIcon className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold mb-1 ${netFlowColor}`}>
            {netFlowSign}${formatNumberWithSuffix(Math.abs(metrics.netFlow7dUsd))}
          </div>
          <p className="text-xs text-muted-foreground">Deposits minus withdrawals</p>
        </CardContent>
      </Card>
      <MetricCard
        title="7d Volume"
        value={`$${formatNumberWithSuffix(metrics.volume7dUsd)}`}
        description="Total deposits + withdrawals"
        icon={<ActivityIcon className="h-4 w-4" />}
      />
    </div>
  );
};
```

**Design decisions:**
- 7d Net Flow card has conditional green/red coloring based on positive/negative
- Uses existing `formatNumberWithSuffix` for compact display (`$1.23M`, `$500K`)
- Grid: `grid-cols-2` → `md:grid-cols-3` → `xl:grid-cols-5`
- `MetricCard` mirrors `VaultMetricsItem` pattern but defined locally (no need for shared component since vault-level and dashboard-level may diverge)

#### 2. New file: `packages/web/src/dashboard/dashboard-flow-chart.tsx`

**Purpose**: Client component wrapper for the interactive flow chart.

```typescript
'use client';

import { AppProviders } from '@/app/app-providers';
import { GlobalFlowChart } from '@/flow-chart/global-flow-chart';

export const DashboardFlowChart = () => (
  <AppProviders>
    <GlobalFlowChart />
  </AppProviders>
);
```

#### 3. Modify: `packages/web/src/app/(dashboard)/page.tsx`

**Change from**: Client component that renders `DashboardContent`
**Change to**: Async server component that fetches metrics and renders SSR cards + client flow chart

```typescript
import { fetchDashboardMetrics } from '@/dashboard/fetch-dashboard-metrics';
import { DashboardMetrics } from '@/dashboard/components/dashboard-metrics';
import { DashboardFlowChart } from '@/dashboard/dashboard-flow-chart';

export default async function DashboardPage() {
  const metrics = await fetchDashboardMetrics();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Protocol overview across all vaults and chains
        </p>
      </div>
      <DashboardMetrics metrics={metrics} />
      <DashboardFlowChart />
    </div>
  );
}
```

#### 4. Keep: `packages/web/src/dashboard/dashboard-content.tsx`

Do NOT delete — it may be imported elsewhere. It just won't be used by the dashboard page anymore. If later confirmed unused, can be removed.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors: `cd packages/web && npx next lint`
- [ ] Dev server starts without errors: `cd packages/web && pnpm dev`

#### Manual Verification:
- [ ] Navigate to `http://localhost:3001/` — 5 metric cards visible above the flow chart
- [ ] Cards show real non-zero data (TVL in $, vault count, depositor count, net flow, volume)
- [ ] Net flow card is green if positive, red if negative
- [ ] Flow chart still works correctly (time range switching, tooltips)
- [ ] Responsive layout: resize browser to verify grid breakpoints

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 3.

---

## Phase 3: Browser Testing

### Overview
Use Playwright MCP to verify the dashboard renders correctly in a real browser.

### Steps:
1. Navigate to `http://localhost:3001/`
2. Take a screenshot of the full dashboard
3. Verify 5 metric cards are visible with data
4. Check responsive behavior at different viewport sizes
5. Verify the flow chart still renders below the metrics

### Success Criteria:

#### Automated Verification:
- [ ] Page loads without console errors

#### Manual Verification:
- [ ] Screenshot shows all 5 metric cards with real data
- [ ] Layout is clean and properly aligned
- [ ] No visual regressions in the flow chart

---

## Testing Strategy

### Unit Tests:
- Not adding unit tests for this feature — the data layer reuses tested functions (`fetchAllVaultsRpcData`, `fetchAllAssetPrices`, bucket math) and the UI is simple presentation.

### Integration Tests:
- Not required — feature is read-only dashboard display.

### Manual Testing Steps:
1. Start dev server: `cd packages/web && pnpm dev`
2. Open `http://localhost:3001/`
3. Verify all 5 cards display with non-zero values
4. Verify the flow chart still works (change time ranges)
5. Resize browser to check responsive breakpoints (mobile → tablet → desktop)
6. Check dark mode if applicable

## Performance Considerations

- **RPC calls cached 10 min** — dashboard load won't trigger new blockchain calls if cache is warm
- **5 parallel Supabase queries** — depositors + deposit buckets + withdraw buckets all fire concurrently
- **SSR means no waterfall** — metrics render in initial HTML, no client-side loading spinner
- **Depositor query returns ~2,000-3,000 rows** (estimated) — lightweight for `Set` deduplication
- **Next.js data cache** — consider adding `export const revalidate = 600` to the page if cache behavior needs tuning (default behavior for server components in Next.js may vary)

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0024-dashboard-overall-metrics.md`
- Related ticket (leaderboards): `thoughts/kuba/tickets/fsn_0025-dashboard-bests-worsts.md`
- Global flow chart plan: `thoughts/shared/plans/2026-02-06-FSN-0015-global-inflow-chart.md`
- Existing depositors fetch pattern: `packages/web/src/depositors/fetch-depositors.ts:77-138`
- Existing vault metrics UI pattern: `packages/web/src/vault-metrics/components/vault-metrics-item.tsx`
- Bucket math: `packages/web/src/lib/buckets.ts`
