# Global Inflow Chart — Dashboard Page Implementation Plan

## Overview

Create a new Dashboard page at `/` that shows a global flow chart aggregating inflow/outflow/net flow data in USD across **all vaults on all chains**. The existing per-vault flow chart is tightly coupled to `VaultContext` (provides `chainId`, `vaultAddress`, `assetDecimals`). We'll extract the shared Recharts UI into a reusable component and build a new API endpoint that aggregates bucket data across all vaults, converting to USD via the on-chain Price Oracle Middleware.

## Current State Analysis

### Flow Chart Architecture
- **UI**: `flow-chart/flow-chart.tsx` renders a Recharts `ComposedChart` with stacked bars (inflow/outflow) and a line (cumulative net flow)
- **Data flow**: `useFlowChartParams` → `useFlowChartQuery` → fetches `/api/vaults/[chainId]/[address]/flow-chart` → Supabase bucket tables
- **Context coupling**: Both `FlowChartContext` (time range, data) and `VaultContext` (chainId, vaultAddress, assetDecimals) are required
- **Tooltip**: `FlowChartTooltip` uses `useVaultContext().assetDecimals` to format values via `parseUnits`/`formatSignificant`

### Bucket Tables
- 8 Supabase tables: `deposit_buckets_{2_hours,8_hours,1_day,4_days}` and `withdraw_buckets_*`
- Each row: `(chain_id, vault_address, bucket_id, sum, count)` — sum is BigInt as text
- Current API filters by `chain_id` AND `vault_address`

### Price Oracle
- Each vault has a `getPriceOracleMiddleware()` function returning the oracle address
- Oracle's `getAssetPrice(assetAddress)` returns `(price, decimals)` tuple
- SDK's `to18()` normalizes to 18 decimals; TVL = `totalAssets_18 * price_18 / 1e18`

### Navigation
- Sidebar at `nav-config.ts:11` has "Dashboard" → `/` already configured
- `next.config.ts:10` redirects `/` → `/vaults` (permanent 308 redirect)
- No Dashboard page/layout exists

## Desired End State

- **`/` route**: Renders a Dashboard page with a global flow chart (no redirect)
- **Global flow chart**: Shows inflow/outflow bars and cumulative net flow line in **USD**
- **Shared chart UI**: The Recharts rendering code is extracted so both per-vault and global charts use the same presentational component
- **New API endpoint**: `GET /api/global/flow-chart?timeRange=7d` aggregates all vaults' bucket data, converts to USD

### Key Discoveries:
- The Recharts rendering in `flow-chart.tsx:89-144` is **not** coupled to `VaultContext` — it just renders `transformedData: FlowChartDataItem[]`. The coupling is in hooks/params/tooltip.
- The `FlowChartTooltip` is the only Recharts-level component that uses `VaultContext` (for `assetDecimals`). For the global USD chart, the tooltip should show `$` formatted values instead.
- The `FlowChartTimeRangePicker`, `FlowChartLoader`, and `FlowChartNoData` components are context-free and can be reused directly.
- The `CHART_COLORS`, `CHART_CONFIG`, `formatChartDate` utilities are context-free.

## What We're NOT Doing

- NOT converting the per-vault chart to USD (it stays in native asset units)
- NOT adding summary stats (total TVL, depositors, etc.) to the dashboard — flow chart only for this ticket
- NOT adding chain/vault filters to the global chart — it's always "all vaults, all chains"
- NOT changing the per-vault chart behavior or API

## Implementation Approach

**Strategy**: Keep changes minimal and avoid breaking existing code. Extract the Recharts rendering into a shared component, create a new global API endpoint, and build the dashboard page.

The per-vault `FlowChart` component will use the extracted shared component internally, maintaining backward compatibility. The new `GlobalFlowChart` component will also use the shared component but with its own data fetching, tooltip, and USD formatting.

---

## Phase 1: Extract Shared Flow Chart UI Component

### Overview
Extract the Recharts rendering code from `flow-chart.tsx` into a shared presentational component that receives data as props.

### Changes Required:

#### 1. New shared component

**File**: `packages/web/src/flow-chart/components/flow-chart-display.tsx` (new file)

Extract the Recharts `ComposedChart` + `Card` rendering from `flow-chart.tsx:52-144` into a standalone component:

```tsx
'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_COLORS, CHART_CONFIG } from '../flow-chart.utils';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import { FlowChartTimeRangePicker } from './flow-chart-time-range-picker';
import type { FlowChartDataItem, TimeRange } from '../flow-chart.types';
import type { ReactNode } from 'react';

interface FlowChartDisplayProps {
  data: FlowChartDataItem[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  tooltipContent: ReactNode;
  yAxisFormatter?: (value: number) => string;
}

export const FlowChartDisplay = ({
  data,
  timeRange,
  onTimeRangeChange,
  tooltipContent,
  yAxisFormatter = (value) => formatNumberWithSuffix(value),
}: FlowChartDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h3>Flow Analysis</h3>
            <FlowChartTimeRangePicker
              value={timeRange}
              onValueChange={onTimeRangeChange}
            />
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            {/* ... same legend as current ... */}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={CHART_CONFIG.margin} stackOffset="sign">
              {/* Same CartesianGrid, XAxis, YAxis, Bars, Line as current */}
              <YAxis tickFormatter={yAxisFormatter} /* ... */ />
              <Tooltip content={tooltipContent} />
              {/* ... */}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
```

#### 2. Refactor existing FlowChartContent

**File**: `packages/web/src/flow-chart/flow-chart.tsx`

Update `FlowChartContent` to use the new `FlowChartDisplay` component:

```tsx
export const FlowChartContent = () => {
  const { params: { isLoading, timeRange, setTimeRange } } = useFlowChartContext();
  const transformedData = useFlowChartData();

  if (isLoading) return <FlowChartLoader />;
  if (!transformedData || transformedData.length === 0) return <FlowChartNoData />;

  return (
    <FlowChartDisplay
      data={transformedData}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      tooltipContent={<FlowChartTooltip />}
    />
  );
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`
- [ ] Existing per-vault flow chart renders identically (no visual regression)

#### Manual Verification:
- [ ] Navigate to any vault page → Overview tab → flow chart looks and behaves exactly the same as before

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 2: Global Flow Chart API Endpoint

### Overview
Create a new API route that aggregates bucket data across **all vaults** and converts amounts to USD using the on-chain Price Oracle.

### Changes Required:

#### 1. Price fetching utility

**File**: `packages/web/src/lib/rpc/asset-prices.ts` (new file)

Create a utility to fetch USD prices for vault assets, leveraging the existing RPC clients and cache:

```typescript
import { type Address } from 'viem';
import { getPublicClient } from './clients';
import { getFromCache, setInCache } from './cache';
import { ERC4626_VAULTS } from '@/lib/vaults-registry';
import { fetchVaultRpcData } from './vault-rpc-data';

const plasmaVaultAbi = [
  { inputs: [], name: 'getPriceOracleMiddleware', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
] as const;

const priceOracleAbi = [
  { inputs: [{ name: 'asset_', type: 'address' }], name: 'getAssetPrice', outputs: [{ name: 'assetPrice', type: 'uint256' }, { name: 'decimals', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

interface AssetPriceInfo {
  assetAddress: Address;
  assetDecimals: number;
  usdPrice: bigint;       // price in raw oracle format
  priceDecimals: number;  // oracle price decimals
}

// Returns a map from "chainId:vaultAddress" → AssetPriceInfo
export async function fetchAllAssetPrices(): Promise<Map<string, AssetPriceInfo>> {
  const cacheKey = 'global:asset-prices';
  const cached = getFromCache<Map<string, AssetPriceInfo>>(cacheKey);
  if (cached) return cached;

  const results = new Map<string, AssetPriceInfo>();

  // Group vaults by chain to batch RPC calls
  const byChain = new Map<number, typeof ERC4626_VAULTS>();
  for (const vault of ERC4626_VAULTS) {
    const list = byChain.get(vault.chainId) || [];
    list.push(vault);
    byChain.set(vault.chainId, list);
  }

  await Promise.all(
    Array.from(byChain.entries()).map(async ([chainId, vaults]) => {
      const client = getPublicClient(chainId);

      for (const vault of vaults) {
        try {
          // Get vault RPC data (cached) for assetAddress and assetDecimals
          const rpcData = await fetchVaultRpcData(chainId, vault.address as Address);
          if (!rpcData.assetAddress || rpcData.assetAddress === '0x0000000000000000000000000000000000000000') continue;

          // Get price oracle address from vault contract
          const priceOracle = await client.readContract({
            address: vault.address as Address,
            abi: plasmaVaultAbi,
            functionName: 'getPriceOracleMiddleware',
          });

          // Get asset USD price from price oracle
          const [price, decimals] = await client.readContract({
            address: priceOracle,
            abi: priceOracleAbi,
            functionName: 'getAssetPrice',
            args: [rpcData.assetAddress],
          });

          const key = `${chainId}:${vault.address.toLowerCase()}`;
          results.set(key, {
            assetAddress: rpcData.assetAddress,
            assetDecimals: rpcData.assetDecimals,
            usdPrice: price,
            priceDecimals: Number(decimals),
          });
        } catch (error) {
          console.error(`Failed to fetch price for ${chainId}:${vault.address}`, error);
        }
      }
    }),
  );

  setInCache(cacheKey, results);
  return results;
}
```

#### 2. Global flow chart API route

**File**: `packages/web/src/app/api/global/flow-chart/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { formatUnits } from 'viem';
import { getUnixTime } from 'date-fns';
import {
  BUCKET_SIZE, getBucketId,
  getDepositBucketTable, getWithdrawBucketTable,
  periodConfig, type Period, PERIODS,
} from '@/lib/buckets';
import { ERC4626_VAULTS } from '@/lib/vaults-registry';
import { fetchAllAssetPrices } from '@/lib/rpc/asset-prices';

// Normalize a bigint amount (in asset decimals) to USD using price oracle data
function toUsd(amount: bigint, assetDecimals: number, usdPrice: bigint, priceDecimals: number): number {
  // amount is in asset native units (e.g., 1000000 for 1 USDC with 6 decimals)
  // usdPrice is in oracle units (e.g., 100000000 for $1 with 8 decimals)
  // Result: human-readable USD number
  const amountDecimal = Number(formatUnits(amount, assetDecimals));
  const priceDecimal = Number(formatUnits(usdPrice, priceDecimals));
  return amountDecimal * priceDecimal;
}

export async function GET(request: NextRequest) {
  const timeRange = (request.nextUrl.searchParams.get('timeRange') || '7d') as string;

  if (!PERIODS.includes(timeRange as Period)) {
    return NextResponse.json({ error: 'Invalid timeRange' }, { status: 400 });
  }

  const period = timeRange as Period;
  const { bucketCount, bucketSize } = periodConfig[period];
  const now = getUnixTime(new Date());
  const endBucketId = getBucketId(now, bucketSize);

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    return endBucketId - (bucketCount - 1 - i) * BUCKET_SIZE[bucketSize];
  });

  const startBucketId = buckets[0];
  if (startBucketId === undefined) {
    return NextResponse.json({ error: 'No buckets found' }, { status: 500 });
  }

  const depositTable = getDepositBucketTable(bucketSize);
  const withdrawTable = getWithdrawBucketTable(bucketSize);

  // Fetch ALL bucket data (no vault_address filter) and asset prices in parallel
  const [depositResult, withdrawResult, assetPrices] = await Promise.all([
    supabase
      .from(depositTable)
      .select('bucket_id, vault_address, chain_id, sum')
      .gte('bucket_id', startBucketId),
    supabase
      .from(withdrawTable)
      .select('bucket_id, vault_address, chain_id, sum')
      .gte('bucket_id', startBucketId),
    fetchAllAssetPrices(),
  ]);

  const depositBuckets = depositResult.data ?? [];
  const withdrawBuckets = withdrawResult.data ?? [];

  // Aggregate by bucket_id, converting each vault's amounts to USD
  const chartData = buckets.map((bucketId) => {
    let depositUsd = 0;
    let withdrawUsd = 0;

    // Sum all deposits in this bucket across all vaults
    for (const row of depositBuckets) {
      if (row.bucket_id !== bucketId) continue;
      const key = `${row.chain_id}:${row.vault_address}`;
      const priceInfo = assetPrices.get(key);
      if (!priceInfo) continue;
      depositUsd += toUsd(BigInt(row.sum), priceInfo.assetDecimals, priceInfo.usdPrice, priceInfo.priceDecimals);
    }

    // Sum all withdrawals in this bucket across all vaults
    for (const row of withdrawBuckets) {
      if (row.bucket_id !== bucketId) continue;
      const key = `${row.chain_id}:${row.vault_address}`;
      const priceInfo = assetPrices.get(key);
      if (!priceInfo) continue;
      withdrawUsd += toUsd(BigInt(row.sum), priceInfo.assetDecimals, priceInfo.usdPrice, priceInfo.priceDecimals);
    }

    return {
      bucketId,
      depositUsd,
      withdrawUsd,
    };
  });

  return NextResponse.json({ flowChart: { chartData } });
}
```

**Key design decisions**:
- Queries Supabase **without** `.eq('vault_address', ...)` to get all vaults at once
- Selects `vault_address` and `chain_id` alongside `bucket_id` and `sum` to match prices
- Converts each row to USD before aggregating
- Returns pre-converted `depositUsd` / `withdrawUsd` numbers (not BigInt strings)
- Asset prices cached for 10 minutes via existing cache infrastructure

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`
- [ ] API route returns valid JSON: `curl http://localhost:3000/api/global/flow-chart?timeRange=7d`

#### Manual Verification:
- [ ] API response contains an array of chartData with `bucketId`, `depositUsd`, `withdrawUsd` fields
- [ ] Values appear reasonable (non-zero for active time periods)

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 3: Global Flow Chart Component

### Overview
Create a new `GlobalFlowChart` component that uses the shared display component with its own data fetching, tooltip, and USD formatting.

### Changes Required:

#### 1. Global flow chart query hook

**File**: `packages/web/src/flow-chart/queries/use-global-flow-chart-query.ts` (new file)

```typescript
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { TimeRange } from '../flow-chart.types';

export const globalFlowChartSchema = z.object({
  flowChart: z.object({
    chartData: z.array(
      z.object({
        bucketId: z.number(),
        depositUsd: z.number(),
        withdrawUsd: z.number(),
      }),
    ),
  }),
});

const fetchGlobalFlowChart = async (timeRange: TimeRange) => {
  const params = new URLSearchParams({ timeRange });
  const response = await fetch(`/api/global/flow-chart?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to fetch global flow chart: ${response.statusText}`);
  const data = await response.json();
  return globalFlowChartSchema.parse(data);
};

export const useGlobalFlowChartQuery = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ['globalFlowChart', timeRange],
    queryFn: () => fetchGlobalFlowChart(timeRange),
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    placeholderData: keepPreviousData,
  });
};
```

#### 2. Global flow chart tooltip

**File**: `packages/web/src/flow-chart/components/global-flow-chart-tooltip.tsx` (new file)

USD-formatted tooltip that doesn't depend on `VaultContext`:

```tsx
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';

interface Props {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

export const GlobalFlowChartTooltip = ({ active, payload, label }: Props) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            ${formatNumberWithSuffix(Math.abs(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
};
```

#### 3. Global flow chart component

**File**: `packages/web/src/flow-chart/global-flow-chart.tsx` (new file)

```tsx
'use client';

import { useState } from 'react';
import { fromUnixTime } from 'date-fns';
import { FlowChartDisplay } from './components/flow-chart-display';
import { FlowChartLoader } from './components/flow-chart-loader';
import { FlowChartNoData } from './components/flow-chart-no-data';
import { GlobalFlowChartTooltip } from './components/global-flow-chart-tooltip';
import { useGlobalFlowChartQuery } from './queries/use-global-flow-chart-query';
import { formatChartDate } from './flow-chart.utils';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import type { FlowChartDataItem, TimeRange } from './flow-chart.types';

export const GlobalFlowChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { data, isLoading } = useGlobalFlowChartQuery(timeRange);

  if (isLoading) return <FlowChartLoader />;

  const chartData = data?.flowChart.chartData;
  if (!chartData || chartData.length === 0) return <FlowChartNoData />;

  // Transform API response to FlowChartDataItem[] (already in USD)
  const transformedData = chartData.reduce<FlowChartDataItem[]>((acc, item) => {
    const lastItem = acc.at(-1);
    const inflow = item.depositUsd;
    const outflow = -item.withdrawUsd;
    const thisNetFlow = inflow + outflow;

    return [
      ...acc,
      {
        date: formatChartDate(fromUnixTime(item.bucketId), timeRange),
        inflow,
        outflow,
        netFlow: (lastItem?.netFlow || 0) + thisNetFlow,
      },
    ];
  }, []);

  return (
    <FlowChartDisplay
      data={transformedData}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      tooltipContent={<GlobalFlowChartTooltip />}
      yAxisFormatter={(value) => `$${formatNumberWithSuffix(value)}`}
    />
  );
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Component can be tested in isolation (or temporarily added to an existing page)

**Implementation Note**: After completing this phase, pause for manual confirmation.

---

## Phase 4: Dashboard Page & Routing

### Overview
Create the Dashboard page at `/` and remove the redirect.

### Changes Required:

#### 1. Remove redirect from next.config.ts

**File**: `packages/web/next.config.ts`

Remove the `/ → /vaults` redirect:

```typescript
async redirects() {
  return [
    // REMOVE: { source: '/', destination: '/vaults', permanent: true },
    {
      source: '/vaults/:chainId/:address',
      destination: '/vaults/:chainId/:address/overview',
      permanent: false,
    },
  ];
},
```

#### 2. Dashboard layout

**File**: `packages/web/src/app/(dashboard)/layout.tsx` (new file)

Using a route group `(dashboard)` to give the root page its own layout without affecting `/vaults` or `/activity`:

```tsx
'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
```

#### 3. Dashboard page

**File**: `packages/web/src/app/(dashboard)/page.tsx` (new file)

```tsx
import { DashboardContent } from '@/dashboard/dashboard-content';

export default function DashboardPage() {
  return <DashboardContent />;
}
```

#### 4. Dashboard content

**File**: `packages/web/src/dashboard/dashboard-content.tsx` (new file)

```tsx
'use client';

import { AppProviders } from '@/app/app-providers';
import { GlobalFlowChart } from '@/flow-chart/global-flow-chart';

export const DashboardContent = () => {
  return (
    <AppProviders>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Protocol overview across all vaults and chains
          </p>
        </div>
        <GlobalFlowChart />
      </div>
    </AppProviders>
  );
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`
- [ ] Next.js build succeeds: `cd packages/web && npx next build`
- [ ] No linting errors: `cd packages/web && npx next lint`

#### Manual Verification:
- [ ] Navigate to `/` → shows Dashboard page with global flow chart
- [ ] Sidebar "Dashboard" link is active/highlighted when on `/`
- [ ] Sidebar "Vaults List" link still works at `/vaults`
- [ ] Sidebar "Activity" link still works at `/activity`
- [ ] Vault detail pages still work (e.g., `/vaults/1/0x.../overview`)
- [ ] Per-vault flow chart still works correctly on vault detail pages
- [ ] Time range picker (7d, 30d, 90d, 1y) works on global chart
- [ ] Tooltip shows USD-formatted values (e.g., "$1.5K")
- [ ] Chart shows green bars (inflow), red bars (outflow), blue line (net flow)

**Implementation Note**: After completing this phase, pause for final manual confirmation.

---

## Testing Strategy

### Unit Tests:
- Not adding new unit tests for this ticket since the Recharts rendering is presentational and the API logic is straightforward aggregation

### Manual Testing Steps:
1. Start the dev server: `cd packages/web && pnpm dev`
2. Navigate to `/` — should see Dashboard with global flow chart
3. Toggle time ranges (7d, 30d, 90d, 1y) — chart should update
4. Hover over bars — tooltip should show USD values
5. Navigate to `/vaults` — vault list page should work unchanged
6. Navigate to any vault → Overview tab — per-vault flow chart should work unchanged
7. Check sidebar highlighting on `/`, `/vaults`, `/activity` routes

## Performance Considerations

- **Asset prices cached for 10 minutes**: The `fetchAllAssetPrices()` function caches results using the existing cache infrastructure, avoiding repeated RPC calls to price oracles
- **Supabase query without vault filter**: Fetching all rows from bucket tables may return more data than the per-vault query. For the current number of vaults (~20), this should be manageable. Supabase may return up to `20 vaults × 90 buckets = 1800 rows` per table, well within limits.
- **Server-side API route**: All aggregation and USD conversion happens server-side, client only receives pre-computed numbers

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0015-global-inflow-chart.md`
- Flow chart implementation: `packages/web/src/flow-chart/`
- Bucket utilities: `packages/web/src/lib/buckets.ts`
- Price Oracle ABI: `packages/sdk/src/abi/price-oracle-middleware.abi.ts`
- Vault RPC data: `packages/web/src/lib/rpc/vault-rpc-data.ts`
