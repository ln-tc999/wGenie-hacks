# FSN-0084: Increase YO SDK Integration Depth

## Overview

Migrate manual `createYoClient` calls to official `@yo-protocol/react` hooks and add new SDK-powered features to increase hackathon scoring on UX Simplicity (30%) and Quality of Integration (20%).

## Current State Analysis

**Currently used (9 React hooks + 5 direct client methods):**
- React hooks (inside `YieldProvider` in `YoVaultSidebar`): `useDeposit`, `useRedeem`, `useVaultState`, `useTokenBalance`, `useUserPosition`, `usePreviewDeposit`, `useShareBalance`, `usePendingRedemptions`
- Direct `createYoClient` in custom hooks: `getVaults()`, `getPrices()`, `getVaultSnapshot()`, `getVaultYieldHistory()`, `getVaultTvlHistory()`, `getSharePriceHistory()`, `getVaultPerformance()`

**Problem:** The direct client calls bypass the official React hooks, which means:
1. No shared query cache with the SDK's built-in hooks
2. Manual query key management
3. Judges see `createYoClient` + `useQuery` instead of idiomatic `useVaultSnapshot` etc.
4. Many available features are unused

### Key Discoveries:
- `YieldProvider` currently only wraps `YoVaultSidebar` (`yo-vault-sidebar.tsx:17`)
- `YoVaultOverview` and `YoTreasuryOverview` run outside `YieldProvider`, so they can't use SDK hooks
- `vault-rpc-data.ts:76-87` uses `createYoClient().getPrices()` server-side — must stay as-is (no React context)
- `use-treasury-positions.ts` uses raw wagmi `useReadContracts` — keep as-is (reads PlasmaVault's positions, not individual user positions)

## Desired End State

After this plan:
- `use-yo-vault-detail.ts` uses 4 SDK React hooks instead of 5 manual `useQuery` calls
- `use-yo-vaults-data.ts` uses `useVaults()` and `usePrices()` SDK hooks instead of manual `createYoClient`
- New features: vault percentile badge, total TVL, user P&L, performance benchmark chart, Merkl rewards display, user position history chart
- Total SDK hook count: ~20 (up from 9)

### Verification:
- `npx tsc --noEmit` passes
- App renders at `http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`
- Vault detail pages at `/vaults/8453/<yo-vault-address>` show new metrics/charts
- No regressions in existing deposit/withdraw flows

## What We're NOT Doing

- NOT migrating `vault-rpc-data.ts` server-side client usage
- NOT migrating `use-treasury-positions.ts` (wagmi multicall for PlasmaVault positions — SDK doesn't cover this)
- NOT adding Merkl claim UI (display only)
- NOT adding routed/zap-in deposit flows
- NOT using pre-built `VaultCard`/`DepositModal`/`RedeemModal` components (we have custom forms)

## Implementation Approach

Three phases, each independently shippable:
1. **YieldProvider lift + hook migrations** — foundation for everything else
2. **Low-effort new features** — vault percentile, total TVL, user P&L
3. **Medium-effort features** — performance benchmark chart, Merkl rewards display, user snapshots chart

---

## Phase 1: YieldProvider Lift + Hook Migrations

### Overview
Add `YieldProvider` to `YoVaultOverview` and `YoTreasuryOverview`, then rewrite 2 custom hooks to use SDK React hooks.

### Changes Required:

#### 1. Add `YieldProvider` to `yo-vault-overview.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-vault-overview.tsx`
**Changes**: Wrap JSX with `YieldProvider`, same pattern as `yo-vault-sidebar.tsx`

```tsx
'use client';

import { YieldProvider } from '@yo-protocol/react';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';
import { useYoVaultDetail } from '../hooks/use-yo-vault-detail';
import { YoVaultMetrics } from './yo-vault-metrics';
import { YoVaultCharts } from './yo-vault-charts';
import { YoSharePriceChart } from './yo-share-price-chart';

const PARTNER_ID = Number(process.env.NEXT_PUBLIC_YO_PARTNER_ID) || 9999;

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoVaultOverview({ chainId, vaultAddress }: Props) {
  return (
    <YieldProvider partnerId={PARTNER_ID} defaultSlippageBps={50}>
      <YoVaultOverviewContent chainId={chainId} vaultAddress={vaultAddress} />
    </YieldProvider>
  );
}

function YoVaultOverviewContent({ chainId, vaultAddress }: Props) {
  const detail = useYoVaultDetail(chainId, vaultAddress);

  return (
    <div className="space-y-6">
      <YoVaultMetrics
        snapshot={detail.snapshot}
        performance={detail.performance}
        isLoading={detail.isLoading}
      />
      <YoVaultCharts
        yieldHistory={detail.yieldHistory}
        tvlHistory={detail.tvlHistory}
        isLoading={detail.isChartsLoading}
      />
      <YoSharePriceChart
        history={detail.sharePriceHistory}
        isLoading={detail.isChartsLoading}
      />
    </div>
  );
}
```

#### 2. Add `YieldProvider` to `yo-treasury-overview.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-treasury-overview.tsx`
**Changes**: Wrap JSX with `YieldProvider`

```tsx
'use client';

import { YieldProvider } from '@yo-protocol/react';
import { TreasuryDashboard } from './treasury-dashboard';
import { useAccount } from 'wagmi';
import { AgentChat } from '@/alpha/agent-chat';
import { ToolRenderer } from '@/alpha/tools/tool-renderer';
import { useAlphaRole } from '../hooks/use-alpha-role';
import { Shield } from 'lucide-react';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

const PARTNER_ID = Number(process.env.NEXT_PUBLIC_YO_PARTNER_ID) || 9999;

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoTreasuryOverview({ chainId, vaultAddress }: Props) {
  const { address } = useAccount();
  const { hasAlphaRole, isConnected } = useAlphaRole({
    chainId,
    vaultAddress,
    userAddress: address,
  });

  return (
    <YieldProvider partnerId={PARTNER_ID} defaultSlippageBps={50}>
      <div className="space-y-4 font-yo">
        <TreasuryDashboard chainId={chainId} vaultAddress={vaultAddress} />
        <div className="relative">
          {isConnected && hasAlphaRole && (
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md bg-yo-neon/10 border border-yo-neon/20 text-yo-neon text-xs font-medium backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              Alpha role granted — you can execute vault actions
            </div>
          )}
          <AgentChat
            apiEndpoint="/api/yo/treasury/chat"
            body={{ callerAddress: address, vaultAddress, chainId }}
            chainId={chainId}
            toolRenderer={ToolRenderer}
            emptyStateText="Ask about YO vaults or manage your treasury"
            placeholder="Ask about YO vaults or manage your treasury..."
          />
        </div>
      </div>
    </YieldProvider>
  );
}
```

#### 3. Rewrite `use-yo-vault-detail.ts` to use SDK hooks

**File**: `packages/web/src/yo-treasury/hooks/use-yo-vault-detail.ts`
**Changes**: Replace `createYoClient` + 5x `useQuery` with 4 SDK hooks

```tsx
'use client';

import {
  useVaultSnapshot,
  useVaultHistory,
  useSharePriceHistory,
  useVaultPerformance,
} from '@yo-protocol/react';
import type { Address } from 'viem';

/**
 * Fetches detailed YO vault data via @yo-protocol/react hooks.
 * Requires YieldProvider ancestor.
 */
export function useYoVaultDetail(_chainId: number, vaultAddress: Address) {
  const {
    snapshot,
    isLoading: isSnapshotLoading,
  } = useVaultSnapshot(vaultAddress);

  const {
    yieldHistory,
    tvlHistory,
    isLoading: isHistoryLoading,
  } = useVaultHistory(vaultAddress);

  const {
    history: sharePriceHistory,
    isLoading: isSharePriceLoading,
  } = useSharePriceHistory(vaultAddress);

  const { performance } = useVaultPerformance(vaultAddress);

  return {
    snapshot,
    yieldHistory,
    tvlHistory,
    sharePriceHistory,
    performance,
    isLoading: isSnapshotLoading,
    isChartsLoading: isHistoryLoading || isSharePriceLoading,
  };
}
```

#### 4. Rewrite `use-yo-vaults-data.ts` to use SDK hooks

**File**: `packages/web/src/yo-treasury/hooks/use-yo-vaults-data.ts`
**Changes**: Replace `createYoClient` + `useQuery` with `useVaults()` and `usePrices()` hooks

```tsx
'use client';

import { useMemo } from 'react';
import { useVaults, usePrices } from '@yo-protocol/react';

export interface YoVaultData {
  id: string;
  name: string;
  vaultAddress: string;
  underlying: string;
  underlyingDecimals: number;
  apy7d: string | null;
  /** TVL in underlying token amount (human-readable, e.g. 7695.3 WETH) */
  tvlAmount: number | null;
  sharePriceFormatted: string | null;
  chainId: number;
}

/**
 * Fetches YO vault metadata (APR, TVL) via @yo-protocol/react useVaults() hook.
 * Requires YieldProvider ancestor.
 */
export function useYoVaultsData(_chainId: number) {
  const { vaults, isLoading } = useVaults();

  const data = useMemo(() => {
    if (!vaults) return undefined;
    return vaults.map((v) => ({
      id: v.id,
      name: v.name,
      vaultAddress: v.contracts.vaultAddress,
      underlying: v.asset.symbol,
      underlyingDecimals: v.asset.decimals,
      apy7d: v.yield['7d'],
      tvlAmount: v.tvl.formatted ? parseFloat(String(v.tvl.formatted)) : null,
      sharePriceFormatted: v.sharePrice.formatted,
      chainId: v.chain.id,
    }));
  }, [vaults]);

  return { data, isLoading };
}

/**
 * CoinGecko ID → token address mapping for Base chain.
 * getPrices() returns prices keyed by CoinGecko IDs, but our
 * components look up prices by token address.
 */
const COINGECKO_TO_ADDRESS: Record<string, string> = {
  'usd-coin': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  'ethereum': '0x4200000000000000000000000000000000000006',
  'coinbase-wrapped-btc': '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  'euro-coin': '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
};

/**
 * Fetches token prices via @yo-protocol/react usePrices() hook.
 * Returns { data: Record<lowercase-token-address, usd-price>, isLoading }.
 * Requires YieldProvider ancestor.
 */
export function useYoPrices(_chainId: number) {
  const { prices, isLoading } = usePrices();

  const data = useMemo(() => {
    if (!prices) return undefined;
    const result: Record<string, number> = {};
    for (const [coingeckoId, usdPrice] of Object.entries(prices)) {
      const addr = COINGECKO_TO_ADDRESS[coingeckoId];
      if (addr) {
        result[addr] = usdPrice as number;
      }
    }
    return result;
  }, [prices]);

  return { data, isLoading };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors: `cd packages/web && npx next lint`

#### Manual Verification:
- [ ] Treasury dashboard at `/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` renders portfolio summary + allocation table with live APR/TVL/prices
- [ ] YO vault detail page (e.g., `/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65`) renders metrics + charts
- [ ] Deposit/withdraw forms still work (separate `YieldProvider` in `YoVaultSidebar`)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 2.

---

## Phase 2: Low-Effort New Features

### Overview
Add vault percentile badge, total TVL display, and user performance P&L using SDK hooks that are now available inside `YieldProvider`.

### Changes Required:

#### 1. Add vault percentile to `yo-vault-metrics.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-vault-metrics.tsx`
**Changes**: Import `useVaultPercentile`, add a 5th metric card showing YO's ranking vs DeFi peers

```tsx
// Add import:
import { useVaultPercentile } from '@yo-protocol/react';

// Add prop:
interface Props {
  snapshot: VaultSnapshot | undefined;
  performance: VaultPerformance | undefined;
  vaultAddress: Address;  // NEW
  isLoading: boolean;
}

// Inside component, call:
const { percentile } = useVaultPercentile(vaultAddress);

// Add 5th item to items array:
{
  title: 'DeFi Ranking',
  value: percentile?.yoRanking
    ? `Top ${percentile.yoRanking}%`
    : '—',
  description: percentile?.pools
    ? `vs ${percentile.pools} DeFi pools`
    : '',
  icon: <Award className="h-4 w-4" />,
}
```

Grid changes from `grid-cols-2 lg:grid-cols-4` to `grid-cols-2 lg:grid-cols-5`. Skeleton count from 4 to 5.

Update caller `yo-vault-overview.tsx` to pass `vaultAddress` prop.

#### 2. Add total TVL to `portfolio-summary.tsx`

**File**: `packages/web/src/yo-treasury/components/portfolio-summary.tsx`
**Changes**: Import `useTotalTvl`, show protocol-wide TVL as a subValue on the "Total Value" card or as a separate display

```tsx
// Add import:
import { useTotalTvl } from '@yo-protocol/react';

// Inside component:
const { tvl: totalTvlData } = useTotalTvl();
const protocolTvl = totalTvlData?.length
  ? totalTvlData[totalTvlData.length - 1]
  : null;

// Update "Total Value" StatCard subValue:
subValue={protocolTvl
  ? `YO Protocol TVL: $${(protocolTvl.value / 1_000_000).toFixed(1)}M`
  : 'treasury holdings'}
```

#### 3. Add user P&L to `allocation-table.tsx`

**File**: `packages/web/src/yo-treasury/components/allocation-table.tsx`
**Changes**: Create a small wrapper component per row that calls `useUserPerformance`, add a "P&L" column

Since React hooks can't be called in a loop, create a `VaultRowPerformance` component:

```tsx
import { useUserPerformance } from '@yo-protocol/react';

function VaultRowPerformance({ vaultAddress }: { vaultAddress: Address }) {
  const { performance } = useUserPerformance(vaultAddress);
  if (!performance?.unrealized?.formatted) return <span className="text-yo-muted">—</span>;
  return (
    <span className="font-mono text-xs text-yo-neon">
      {performance.unrealized.formatted}
    </span>
  );
}
```

Add a "P&L" `<th>` column and render `<VaultRowPerformance vaultAddress={row.vaultAddress} />` in each row.

**Note**: `useUserPerformance(vault, user?)` — when `user` is omitted, the hook may use the connected wallet. For treasury context, the connected user's personal performance in each YO vault is what we want to show. If the hook doesn't return data (user has no direct position), the column shows "—".

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Vault metrics grid shows 5 cards including "DeFi Ranking" with percentile data
- [ ] Portfolio summary shows protocol-wide TVL
- [ ] Allocation table shows P&L column (may show "—" if no user positions)

**Implementation Note**: After completing this phase, pause for manual verification.

---

## Phase 3: Medium-Effort Features

### Overview
Add performance benchmark chart, Merkl rewards display, and user position history chart.

### Changes Required:

#### 1. Performance Benchmark Chart — new component

**File**: `packages/web/src/yo-treasury/components/yo-performance-benchmark.tsx` (NEW)
**Changes**: Create a multi-line chart comparing vault price vs competitor DeFi pools

```tsx
'use client';

import { usePerformanceBenchmark } from '@yo-protocol/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Address } from 'viem';

interface Props {
  vaultAddress: Address;
}

const POOL_COLORS = ['#627EEA', '#FFAF4F', '#4E6FFF', '#FF6B6B', '#22C55E'];

export function YoPerformanceBenchmark({ vaultAddress }: Props) {
  const { benchmark, isLoading } = usePerformanceBenchmark(vaultAddress);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!benchmark?.vaultPrices?.length) return null;

  // Merge vault + pool price data by timestamp
  // Build { timestamp, vault: price, pool1: price, pool2: price, ... }
  const timestamps = new Set<number>();
  for (const p of benchmark.vaultPrices) timestamps.add(p.timestamp);
  for (const pool of benchmark.pools ?? []) {
    for (const p of pool.prices) timestamps.add(p.timestamp);
  }

  const sorted = [...timestamps].sort((a, b) => a - b);
  const vaultMap = new Map(benchmark.vaultPrices.map(p => [p.timestamp, p.pricePerShare]));
  const poolMaps = (benchmark.pools ?? []).map(pool =>
    new Map(pool.prices.map(p => [p.timestamp, p.pricePerShare]))
  );

  // Normalize to base-100 from first data point
  const vaultBase = vaultMap.get(sorted[0]);
  const poolBases = poolMaps.map(m => m.get(sorted[0]));

  const chartData = sorted.map(ts => {
    const point: Record<string, number> = { timestamp: ts };
    const vp = vaultMap.get(ts);
    if (vp !== undefined && vaultBase) {
      point['vault'] = (parseFloat(String(vp)) / parseFloat(String(vaultBase))) * 100;
    }
    poolMaps.forEach((m, i) => {
      const pp = m.get(ts);
      if (pp !== undefined && poolBases[i]) {
        point[`pool_${i}`] = (parseFloat(String(pp)) / parseFloat(String(poolBases[i]))) * 100;
      }
    });
    return point;
  });

  const formatDate = (ts: number) => {
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Performance vs DeFi Peers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="timestamp" tickFormatter={formatDate}
                className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }}
                axisLine={false} tickLine={false} minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }}
                axisLine={false} tickLine={false} width={45}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="text-muted-foreground mb-1">{formatDate(label as number)}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
                          {p.name}: {Number(p.value).toFixed(2)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone" dataKey="vault" name={benchmark.vault.name}
                stroke="#D6FF34" strokeWidth={2.5} dot={false}
              />
              {(benchmark.pools ?? []).map((pool, i) => (
                <Line
                  key={pool.name} type="monotone" dataKey={`pool_${i}`}
                  name={`${pool.protocol} ${pool.name}`}
                  stroke={POOL_COLORS[i % POOL_COLORS.length]}
                  strokeWidth={1.5} dot={false} strokeDasharray="4 2"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

**File**: `packages/web/src/yo-treasury/components/yo-vault-overview.tsx`
**Changes**: Add `<YoPerformanceBenchmark vaultAddress={vaultAddress} />` after `<YoSharePriceChart />`

#### 2. Merkl Rewards Display — new component

**File**: `packages/web/src/yo-treasury/components/yo-merkl-rewards.tsx` (NEW)
**Changes**: Display active campaigns and user's claimable rewards (no claim button)

```tsx
'use client';

import { useMerklCampaigns, useMerklRewards } from '@yo-protocol/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift } from 'lucide-react';

export function YoMerklRewards() {
  const { campaigns, isLoading: isCampaignsLoading } = useMerklCampaigns();
  const { totalClaimable, hasClaimable, isLoading: isRewardsLoading } = useMerklRewards();

  const isLoading = isCampaignsLoading || isRewardsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  const liveCampaigns = campaigns?.filter(c => c.status === 'LIVE') ?? [];

  if (liveCampaigns.length === 0 && !hasClaimable) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Gift className="h-4 w-4" />
          YO Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasClaimable && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-yo-neon/5 border border-yo-neon/10">
            <div>
              <p className="text-xs text-muted-foreground">Claimable Rewards</p>
              <p className="text-lg font-semibold text-yo-neon font-mono">
                {totalClaimable ? String(totalClaimable) : '—'}
              </p>
            </div>
          </div>
        )}

        {liveCampaigns.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Active Campaigns ({liveCampaigns.length})
            </p>
            <div className="space-y-1.5">
              {liveCampaigns.slice(0, 5).map((c) => (
                <div
                  key={c.campaignId}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-white/[0.02]"
                >
                  <span className="text-foreground truncate">{c.name || c.campaignId}</span>
                  <span className="text-yo-neon shrink-0 ml-2">LIVE</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**File**: `packages/web/src/yo-treasury/components/yo-vault-overview.tsx`
**Changes**: Add `<YoMerklRewards />` after the benchmark chart

#### 3. User Position History Chart — new component

**File**: `packages/web/src/yo-treasury/components/yo-user-snapshots.tsx` (NEW)
**Changes**: Show user's historical position value over time

```tsx
'use client';

import { useUserSnapshots } from '@yo-protocol/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';

interface Props {
  vaultAddress: Address;
}

function formatDate(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

export function YoUserSnapshots({ vaultAddress }: Props) {
  const { address } = useAccount();
  const { snapshots, isLoading } = useUserSnapshots(vaultAddress, address);

  if (!address) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!snapshots || snapshots.length < 2) return null;

  const chartData = snapshots.map((s) => ({
    timestamp: s.timestamp,
    value: parseFloat(String(s.assetBalanceUsd)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Your Position History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="userSnapshotGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D6FF34" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#D6FF34" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="timestamp" tickFormatter={formatDate}
                className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }}
                axisLine={false} tickLine={false} minTickGap={40}
              />
              <YAxis
                tickFormatter={formatUsd}
                className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }}
                axisLine={false} tickLine={false} width={55}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {formatDate(label as number)}
                      </p>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {formatUsd(Number(payload[0].value))}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone" dataKey="value"
                stroke="#D6FF34" strokeWidth={2}
                fill="url(#userSnapshotGradient)" dot={false}
                activeDot={{ r: 4, fill: '#D6FF34', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

**File**: `packages/web/src/yo-treasury/components/yo-vault-overview.tsx`
**Changes**: Add `<YoUserSnapshots vaultAddress={vaultAddress} />` after Merkl rewards

#### 4. Final `yo-vault-overview.tsx` after all Phase 3 additions

```tsx
function YoVaultOverviewContent({ chainId, vaultAddress }: Props) {
  const detail = useYoVaultDetail(chainId, vaultAddress);

  return (
    <div className="space-y-6">
      <YoVaultMetrics
        snapshot={detail.snapshot}
        performance={detail.performance}
        vaultAddress={vaultAddress}
        isLoading={detail.isLoading}
      />
      <YoVaultCharts
        yieldHistory={detail.yieldHistory}
        tvlHistory={detail.tvlHistory}
        isLoading={detail.isChartsLoading}
      />
      <YoSharePriceChart
        history={detail.sharePriceHistory}
        isLoading={detail.isChartsLoading}
      />
      <YoPerformanceBenchmark vaultAddress={vaultAddress} />
      <YoMerklRewards />
      <YoUserSnapshots vaultAddress={vaultAddress} />
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Performance benchmark chart renders on YO vault detail page with vault line (neon green) + competitor pool lines (dashed)
- [ ] Merkl rewards section shows active campaigns (or hides if none)
- [ ] User position history chart shows when connected wallet has YO vault positions (or hides if no data)
- [ ] All existing features still work (treasury dashboard, deposit/withdraw, agent chat)

---

## Testing Strategy

### Type Check:
- `cd packages/web && npx tsc --noEmit` after each phase

### Manual Testing:
1. Treasury dashboard: `http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`
2. YO vault detail (yoUSD): `http://localhost:3000/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65`
3. Deposit/withdraw flows (verify `YoVaultSidebar` still works independently)

## Performance Considerations

- Two separate `YieldProvider` instances may exist on a page (one in `YoVaultOverview`/`YoTreasuryOverview`, one in `YoVaultSidebar`). This means duplicate API calls for overlapping queries. Acceptable for hackathon — the SDK caches internally per provider.
- `useUserPerformance` is called once per vault row (4 calls in allocation table). Each is an independent API call. The SDK manages deduplication.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0084-check-for-yo-sdk-features.md`
- YO SDK example app: `external/yo-protocol-react-example/`
- YO SDK source: `external/core/` (Solidity contracts — npm package is `@yo-protocol/core`)
- Hackathon criteria: `thoughts/kuba/notes/yo-hackathon/hack-outline.md`
