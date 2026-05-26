# Global Inflow Chart — Dashboard Page Implementation Plan (v2)

## Overview

Create a new Dashboard page at `/` that shows a global flow chart aggregating inflow/outflow/net flow data in **USD** across all vaults on all chains. Extract the shared Recharts UI into a reusable component and build a new API endpoint that aggregates bucket data across all vaults, converting to USD via the on-chain Price Oracle Middleware using efficient multicall batching.

## Current State Analysis

### Flow Chart Architecture
- **UI**: `flow-chart/flow-chart.tsx` renders a Recharts `ComposedChart` with stacked bars (inflow/outflow) and a line (cumulative net flow)
- **Data flow**: `useFlowChartParams` → `useFlowChartQuery` → fetches `/api/vaults/[chainId]/[address]/flow-chart` → Supabase bucket tables
- **Context coupling**: Both `FlowChartContext` (time range, data) and `VaultContext` (chainId, vaultAddress, assetDecimals) are required
- **Tooltip**: `FlowChartTooltip` uses `useVaultContext().assetDecimals` to format values via `parseUnits`/`formatSignificant`

### Recharts Rendering (flow-chart.tsx:52-144)
The chart rendering code itself is **presentational only** — it renders from `transformedData: FlowChartDataItem[]` and uses no context. The coupling to `VaultContext` is only in:
1. `useFlowChartData` hook (for `assetDecimals` to format raw BigInt sums)
2. `FlowChartTooltip` component (for `assetDecimals` to display tooltip values)

Context-free components that can be reused directly:
- `FlowChartTimeRangePicker` — time range selector
- `FlowChartLoader` — loading skeleton
- `FlowChartNoData` — empty state
- `CHART_COLORS`, `CHART_CONFIG`, `formatChartDate` — utilities

### Bucket Tables
- 8 Supabase tables: `deposit_buckets_{2_hours,8_hours,1_day,4_days}` and `withdraw_buckets_*`
- Each row: `(chain_id, vault_address, bucket_id, sum, count)` — sum is BigInt as text
- Current API filters by `chain_id` AND `vault_address`

### Price Oracle
- Each PlasmaVault has a `getPriceOracleMiddleware()` returning the oracle address
- Oracle's `getAssetPrice(assetAddress)` returns `(price: uint256, decimals: uint256)` tuple
- SDK normalizes to 18 decimals via `to18(price, Number(decimals))`
- We can use viem multicall to batch these calls per chain

### Navigation & Routing
- Sidebar `nav-config.ts:9-25` has "Dashboard" → `/` already configured
- `next.config.ts:8-13` redirects `/` → `/vaults` (permanent 308 redirect)
- No Dashboard page/layout exists
- Both `vaults/layout.tsx` and `activity/layout.tsx` wrap children in `SidebarLayout` with `pathname` prop
- `AppProviders` (React Query + Wagmi) is NOT in root layout — each page wraps its own content

### Types
```typescript
// flow-chart.types.tsx
export type TimeRange = '7d' | '30d' | '90d' | '1y';
export interface FlowChartDataItem {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}
```

## Desired End State

- **`/` route**: Renders a Dashboard page with a global flow chart (no redirect)
- **Global flow chart**: Shows inflow/outflow bars and cumulative net flow line in **USD**
- **Shared chart UI**: The Recharts rendering code is extracted so both per-vault and global charts use the same presentational component
- **New API endpoint**: `GET /api/global/flow-chart?timeRange=7d` aggregates all vaults' bucket data, converts to USD
- **Efficient RPC**: Price oracle calls are batched using multicall (2 multicalls per chain)

## What We're NOT Doing

- NOT converting the per-vault chart to USD (it stays in native asset units)
- NOT adding summary stats (total TVL, depositors count, etc.) to the dashboard — flow chart only
- NOT adding chain/vault filters to the global chart — it's always "all vaults, all chains"
- NOT changing the per-vault chart behavior or API
- NOT adding unit tests — this is presentational + straightforward aggregation

## Implementation Approach

**Strategy**: Keep changes minimal and non-breaking. Extract the Recharts rendering into a shared component, create a new global API endpoint with multicall-batched price fetching, and build the dashboard page.

The per-vault `FlowChartContent` will use the extracted shared component internally, maintaining identical behavior. The new `GlobalFlowChart` will also use the shared component but with its own data fetching, tooltip, and USD formatting.

---

## Phase 1: Extract Shared Flow Chart UI Component

### Overview
Extract the Recharts rendering code from `flow-chart.tsx` into a shared presentational component that receives data and configuration as props.

### Changes Required:

#### 1. New shared component

**File**: `packages/web/src/flow-chart/components/flow-chart-display.tsx` (new file)

Extract the Recharts `ComposedChart` + `Card` rendering from `flow-chart.tsx:52-144` into a standalone component:

```tsx
'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_COLORS, CHART_CONFIG } from '../flow-chart.utils';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import { FlowChartTimeRangePicker } from './flow-chart-time-range-picker';
import type { FlowChartDataItem, TimeRange } from '../flow-chart.types';
import type { ReactElement } from 'react';

interface FlowChartDisplayProps {
  data: FlowChartDataItem[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  tooltipContent: ReactElement;
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
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.inflow }}
              />
              <span className="text-muted-foreground">Inflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.outflow }}
              />
              <span className="text-muted-foreground">Outflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.netFlow }}
              />
              <span className="text-muted-foreground">Net Flow</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={CHART_CONFIG.margin}
              stackOffset="sign"
            >
              <CartesianGrid
                strokeDasharray={CHART_CONFIG.strokeDasharray}
                className="stroke-muted"
              />
              <XAxis
                dataKey="date"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                minTickGap={50}
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={yAxisFormatter}
              />
              <Tooltip content={tooltipContent} />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="2 2" />
              <Bar
                dataKey="inflow"
                fill={CHART_COLORS.inflow}
                name="Inflow"
                stackId="flow"
              />
              <Bar
                dataKey="outflow"
                fill={CHART_COLORS.outflow}
                name="Outflow"
                stackId="flow"
              />
              <Line
                type="monotone"
                dataKey="netFlow"
                stroke={CHART_COLORS.netFlow}
                strokeWidth={CHART_CONFIG.strokeWidth}
                dot={false}
                activeDot={{
                  r: CHART_CONFIG.activeDotRadius,
                  stroke: CHART_COLORS.netFlow,
                  strokeWidth: CHART_CONFIG.strokeWidth,
                }}
                name="Net Flow"
              />
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

Replace the inline Recharts rendering in `FlowChartContent` (lines 52-144) with the new `FlowChartDisplay` component. The `FlowChart` wrapper component and `FlowChartContext.Provider` remain unchanged.

```tsx
import { FlowChartDisplay } from './components/flow-chart-display';

// FlowChart wrapper stays the same (lines 25-37)

export const FlowChartContent = () => {
  const {
    params: { isLoading, timeRange, setTimeRange },
  } = useFlowChartContext();

  const transformedData = useFlowChartData();

  if (isLoading) return <FlowChartLoader />;

  if (!transformedData || transformedData.length === 0) {
    return <FlowChartNoData />;
  }

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

Imports no longer needed in `flow-chart.tsx` after refactor:
- `ComposedChart`, `Bar`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `ReferenceLine` from `recharts`
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `CHART_COLORS`, `CHART_CONFIG`
- `formatNumberWithSuffix`
- `FlowChartTimeRangePicker`

Imports still needed:
- `FlowChartTooltip`, `useFlowChartContext`, `FlowChartContext`, `useFlowChartParams`, `useFlowChartData`, `FlowChartLoader`, `FlowChartNoData`, `FlowChartDisplay`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Navigate to any vault page → Overview tab → flow chart looks and behaves exactly the same as before
- [ ] Time range picker works, tooltip shows correctly, legend colors are right

**Implementation Note**: After completing this phase, pause for manual confirmation that the per-vault chart is visually identical.

---

## Phase 2: Asset Price Fetching Utility

### Overview
Create a utility that fetches USD prices for all vault assets using efficient multicall batching — 2 multicalls per chain instead of individual calls per vault.

### Changes Required:

#### 1. Price fetching utility

**File**: `packages/web/src/lib/rpc/asset-prices.ts` (new file)

```typescript
import { type Address, formatUnits } from 'viem';
import { getPublicClient } from './clients';
import { getFromCache, setInCache } from './cache';
import { ERC4626_VAULTS } from '@/lib/vaults-registry';
import { fetchVaultRpcData } from './vault-rpc-data';

const plasmaVaultAbi = [
  {
    inputs: [],
    name: 'getPriceOracleMiddleware',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const priceOracleAbi = [
  {
    inputs: [{ name: 'asset_', type: 'address' }],
    name: 'getAssetPrice',
    outputs: [
      { name: 'assetPrice', type: 'uint256' },
      { name: 'decimals', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface AssetPriceInfo {
  assetAddress: Address;
  assetDecimals: number;
  usdPrice: bigint; // raw oracle price
  priceDecimals: number; // oracle price decimals
}

/**
 * Converts a raw asset amount to USD using price oracle data.
 * amount is in asset native units (e.g., 1000000 for 1 USDC with 6 decimals)
 * Returns a human-readable USD number.
 */
export function toUsd(
  amount: bigint,
  assetDecimals: number,
  usdPrice: bigint,
  priceDecimals: number,
): number {
  const amountDecimal = Number(formatUnits(amount, assetDecimals));
  const priceDecimal = Number(formatUnits(usdPrice, priceDecimals));
  return amountDecimal * priceDecimal;
}

/**
 * Fetches USD prices for all vault assets using multicall batching.
 * Groups vaults by chain and makes 2 multicalls per chain:
 * 1. getPriceOracleMiddleware() for all vaults on that chain
 * 2. getAssetPrice(assetAddress) for all vaults on that chain
 *
 * Results cached for 10 minutes.
 *
 * @returns Map from "chainId:vaultAddress" → AssetPriceInfo
 */
export async function fetchAllAssetPrices(): Promise<
  Map<string, AssetPriceInfo>
> {
  const cacheKey = 'global:asset-prices';
  const cached = getFromCache<Map<string, AssetPriceInfo>>(cacheKey);
  if (cached) return cached;

  const results = new Map<string, AssetPriceInfo>();

  // Group vaults by chain for batched RPC calls
  const byChain = new Map<number, typeof ERC4626_VAULTS>();
  for (const vault of ERC4626_VAULTS) {
    const list = byChain.get(vault.chainId) || [];
    list.push(vault);
    byChain.set(vault.chainId, list);
  }

  await Promise.all(
    Array.from(byChain.entries()).map(async ([chainId, vaults]) => {
      const client = getPublicClient(chainId);

      // Step 1: Fetch assetAddress + assetDecimals for all vaults (already cached per-vault)
      const rpcDataMap = new Map<
        string,
        { assetAddress: Address; assetDecimals: number }
      >();
      await Promise.all(
        vaults.map(async (vault) => {
          try {
            const rpcData = await fetchVaultRpcData(
              chainId,
              vault.address as Address,
            );
            if (
              rpcData.assetAddress &&
              rpcData.assetAddress !==
                '0x0000000000000000000000000000000000000000'
            ) {
              rpcDataMap.set(vault.address.toLowerCase(), {
                assetAddress: rpcData.assetAddress,
                assetDecimals: rpcData.assetDecimals,
              });
            }
          } catch (error) {
            console.error(
              `Failed to fetch RPC data for ${chainId}:${vault.address}`,
              error,
            );
          }
        }),
      );

      const validVaults = vaults.filter((v) =>
        rpcDataMap.has(v.address.toLowerCase()),
      );
      if (validVaults.length === 0) return;

      try {
        // Step 2: Multicall getPriceOracleMiddleware() for all vaults on this chain
        const oracleResults = await client.multicall({
          contracts: validVaults.map((vault) => ({
            address: vault.address as Address,
            abi: plasmaVaultAbi,
            functionName: 'getPriceOracleMiddleware' as const,
          })),
          allowFailure: true,
        });

        // Step 3: Multicall getAssetPrice() for all vaults using their oracle addresses
        const priceContracts = validVaults
          .map((vault, i) => {
            const oracleResult = oracleResults[i];
            const rpcData = rpcDataMap.get(vault.address.toLowerCase());
            if (
              !oracleResult ||
              oracleResult.status === 'failure' ||
              !oracleResult.result ||
              !rpcData
            )
              return null;
            return {
              address: oracleResult.result as Address,
              abi: priceOracleAbi,
              functionName: 'getAssetPrice' as const,
              args: [rpcData.assetAddress] as const,
              vaultAddress: vault.address.toLowerCase(),
            };
          })
          .filter(
            (c): c is NonNullable<typeof c> => c !== null,
          );

        if (priceContracts.length === 0) return;

        const priceResults = await client.multicall({
          contracts: priceContracts.map(({ address, abi, functionName, args }) => ({
            address,
            abi,
            functionName,
            args,
          })),
          allowFailure: true,
        });

        // Step 4: Build results map
        priceContracts.forEach((contract, i) => {
          const priceResult = priceResults[i];
          if (
            !priceResult ||
            priceResult.status === 'failure' ||
            !priceResult.result
          )
            return;

          const [price, decimals] = priceResult.result as [bigint, bigint];
          const rpcData = rpcDataMap.get(contract.vaultAddress);
          if (!rpcData) return;

          const key = `${chainId}:${contract.vaultAddress}`;
          results.set(key, {
            assetAddress: rpcData.assetAddress,
            assetDecimals: rpcData.assetDecimals,
            usdPrice: price,
            priceDecimals: Number(decimals),
          });
        });
      } catch (error) {
        console.error(
          `Failed to fetch prices for chain ${chainId}`,
          error,
        );
      }
    }),
  );

  setInCache(cacheKey, results);
  return results;
}
```

**Key design decisions**:
- Uses `fetchVaultRpcData` (already cached per-vault at 10 min TTL) for assetAddress/assetDecimals
- Groups vaults by chain → 2 multicalls per chain (oracle addresses, then prices)
- Uses `allowFailure: true` so one failing vault doesn't break all prices
- `toUsd()` exported for use by the API endpoint
- Entire results map cached for 10 minutes

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] N/A — utility is tested via Phase 3 API endpoint

**Implementation Note**: This phase has no visible output. Proceed directly to Phase 3.

---

## Phase 3: Global Flow Chart API Endpoint

### Overview
Create a new API route that aggregates bucket data across all vaults and converts amounts to USD.

### Changes Required:

#### 1. Global flow chart API route

**File**: `packages/web/src/app/api/global/flow-chart/route.ts` (new file)

Modeled after the existing per-vault endpoint at `app/api/vaults/[chainId]/[address]/flow-chart/route.ts`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { getUnixTime } from 'date-fns';
import {
  BUCKET_SIZE,
  getBucketId,
  getDepositBucketTable,
  getWithdrawBucketTable,
  periodConfig,
  type Period,
  PERIODS,
} from '@/lib/buckets';
import { fetchAllAssetPrices, toUsd } from '@/lib/rpc/asset-prices';

export async function GET(request: NextRequest) {
  const timeRange = (request.nextUrl.searchParams.get('timeRange') ||
    '7d') as string;

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

    for (const row of depositBuckets) {
      if (row.bucket_id !== bucketId) continue;
      const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
      const priceInfo = assetPrices.get(key);
      if (!priceInfo) continue;
      depositUsd += toUsd(
        BigInt(String(row.sum)),
        priceInfo.assetDecimals,
        priceInfo.usdPrice,
        priceInfo.priceDecimals,
      );
    }

    for (const row of withdrawBuckets) {
      if (row.bucket_id !== bucketId) continue;
      const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
      const priceInfo = assetPrices.get(key);
      if (!priceInfo) continue;
      withdrawUsd += toUsd(
        BigInt(String(row.sum)),
        priceInfo.assetDecimals,
        priceInfo.usdPrice,
        priceInfo.priceDecimals,
      );
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
- Uses `String(row.sum)` and `String(row.vault_address)` before conversion — Supabase may return `text` columns as JS `number` if value looks numeric
- Converts each row to USD before aggregating
- Returns pre-converted `depositUsd` / `withdrawUsd` numbers (not BigInt strings)
- Asset prices and vault RPC data cached for 10 minutes

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Start dev server: `cd packages/web && pnpm dev`
- [ ] API returns valid JSON: `curl http://localhost:3000/api/global/flow-chart?timeRange=7d`
- [ ] Response contains `flowChart.chartData` array with `bucketId`, `depositUsd`, `withdrawUsd` fields
- [ ] Values appear reasonable (non-zero for active time periods)

**Implementation Note**: After completing this phase, pause for manual confirmation that the API returns reasonable data.

---

## Phase 4: Global Flow Chart Component

### Overview
Create a `GlobalFlowChart` component that uses the shared display component with its own data fetching, tooltip, and USD formatting.

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
  const response = await fetch(
    `/api/global/flow-chart?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch global flow chart: ${response.statusText}`,
    );
  }
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
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
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
  const transformedData = chartData.reduce<FlowChartDataItem[]>(
    (acc, item) => {
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
    },
    [],
  );

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
- [ ] N/A — component is tested in Phase 5 when mounted on the Dashboard page

**Implementation Note**: Proceed directly to Phase 5.

---

## Phase 5: Dashboard Page & Routing

### Overview
Create the Dashboard page at `/`, remove the redirect, and wire up the layout.

### Changes Required:

#### 1. Remove redirect from next.config.ts

**File**: `packages/web/next.config.ts`

Remove the `/` → `/vaults` redirect (lines 8-12). Keep the vault detail redirect.

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: '/vaults/:chainId/:address',
        destination: '/vaults/:chainId/:address/overview',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
```

#### 2. Dashboard layout

**File**: `packages/web/src/app/(dashboard)/layout.tsx` (new file)

Using a route group `(dashboard)` to give the root page its own layout (matching the pattern used by `vaults/layout.tsx` and `activity/layout.tsx`):

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
- [ ] Y-axis labels show "$" prefix

**Implementation Note**: After completing this phase, pause for final manual confirmation.

---

## Testing Strategy

### Manual Testing Steps:
1. Start the dev server: `cd packages/web && pnpm dev`
2. Navigate to `/` — should see Dashboard with global flow chart
3. Toggle time ranges (7d, 30d, 90d, 1y) — chart should update
4. Hover over bars — tooltip should show USD values with `$` prefix
5. Navigate to `/vaults` — vault list page should work unchanged
6. Navigate to any vault → Overview tab — per-vault flow chart should work unchanged (native asset units, no `$`)
7. Check sidebar highlighting on `/`, `/vaults`, `/activity` routes
8. Check mobile bottom navigation highlighting

## Performance Considerations

- **Asset prices cached for 10 minutes**: `fetchAllAssetPrices()` caches the entire results map, so subsequent requests within the TTL window make zero RPC calls
- **Vault RPC data also cached (10 min)**: `fetchVaultRpcData` is called per-vault and cached, so the price utility benefits from pre-warmed cache
- **2 multicalls per chain** (vs N calls per vault): For ~20 vaults across ~4 chains, this is ~8 RPC calls total instead of ~80
- **Supabase query scope**: Without vault filter, queries return `~20 vaults × 91 buckets = ~1820 rows` per table — well within Supabase limits
- **Server-side aggregation**: All conversion and summing happens in the API route; client receives pre-computed numbers

## File Summary

### New Files (7):
1. `packages/web/src/flow-chart/components/flow-chart-display.tsx` — shared Recharts display component
2. `packages/web/src/lib/rpc/asset-prices.ts` — multicall-batched USD price fetching
3. `packages/web/src/app/api/global/flow-chart/route.ts` — global flow chart API endpoint
4. `packages/web/src/flow-chart/queries/use-global-flow-chart-query.ts` — React Query hook
5. `packages/web/src/flow-chart/components/global-flow-chart-tooltip.tsx` — USD tooltip
6. `packages/web/src/flow-chart/global-flow-chart.tsx` — global flow chart component
7. `packages/web/src/dashboard/dashboard-content.tsx` — dashboard page content
8. `packages/web/src/app/(dashboard)/layout.tsx` — dashboard layout
9. `packages/web/src/app/(dashboard)/page.tsx` — dashboard page

### Modified Files (2):
1. `packages/web/src/flow-chart/flow-chart.tsx` — refactored to use FlowChartDisplay
2. `packages/web/next.config.ts` — removed `/` → `/vaults` redirect

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0015-global-inflow-chart.md`
- Previous plan: `thoughts/shared/plans/2026-02-06-FSN-0015-global-inflow-chart.md`
- Flow chart implementation: `packages/web/src/flow-chart/`
- Bucket utilities: `packages/web/src/lib/buckets.ts`
- Price Oracle ABI: `packages/sdk/src/abi/price-oracle-middleware.abi.ts`
- Vault RPC data: `packages/web/src/lib/rpc/vault-rpc-data.ts`
- RPC cache: `packages/web/src/lib/rpc/cache.ts`
- SDK PlasmaVault: `packages/sdk/src/PlasmaVault.ts` (lines 311-331 for price methods)
- Nav config: `packages/web/src/components/sidebar/nav-config.ts`
