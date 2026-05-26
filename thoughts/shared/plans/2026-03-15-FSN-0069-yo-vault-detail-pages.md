# YO Vault Detail Pages — Rich Data Sections

## Overview

Add YO-specific data sections below the existing generic metrics on individual YO vault detail pages (yoUSD, yoETH, yoBTC, yoEUR). Uses `@yo-protocol/core` REST API for yield/TVL/share price history, displayed with recharts in the YO dark theme. The existing `VaultDetailLayout` shell (header, breadcrumbs, tabs, deposit/withdraw sidebar) stays unchanged.

## Current State Analysis

- Individual YO vaults at `/vaults/8453/<address>` render `VaultOverviewContent` — just 4 generic stat cards (TVL, Vault Age, Active Depositors, All-time Depositors)
- The `yo-treasury` tag vault gets custom `YoTreasuryOverview`, but `yo-vault` tagged vaults fall through to the default
- YO theme (neon green `#D6FF34`, Space Grotesk, `bg-yo-dark`) is already wired via `.yo` CSS class on `<html>`
- `@yo-protocol/core` SDK is already a dependency; `createYoClient` pattern used in `use-yo-vaults-data.ts`
- recharts is already a dependency with two existing chart patterns (direct imports in FlowChart, shadcn wrapper in DepositorsChart)

### Key Discoveries:
- `page.tsx:19` only checks `yo-treasury` tag, not `yo-vault` — need to add a branch
- `useYoVaultsData` hook at `yo-treasury/hooks/use-yo-vaults-data.ts:22` shows the `createYoClient` + `useQuery` pattern to follow
- The `VaultProvider` context already provides `asset`, `assetDecimals`, `assetSymbol` via `useVaultContext()`
- FlowChart at `flow-chart/components/flow-chart-display.tsx` uses direct recharts imports with Tailwind classes — simplest pattern to follow
- YO vault addresses are in `plasma-vaults.json` with tag `yo-vault` and `"app": "yo"`

## Desired End State

When visiting `/vaults/8453/0x50c749ae210d3977adc824ae11f3c7fd10c871e9` (yoEUR or any yo-vault):
1. Existing generic metrics (TVL, Age, Depositors) render at top as before
2. Below that: a YO-branded metrics row (7d APR, Share Price, Exchange Rate, Total Assets)
3. Below that: two side-by-side charts — TVL History + Yield History
4. Below that: Share Price History chart (full width)
5. All in YO dark theme with neon green accents

### Verification:
- Visit any yo-vault URL on localhost:3000 → see metrics + 3 charts below the generic stats
- Charts render with proper YO theming (dark cards, neon green lines/areas)
- Loading states show animated skeletons
- `pnpm --filter @wgenie/fusion-web typecheck` passes

## What We're NOT Doing

- Replacing the deposit/withdraw sidebar with yo-protocol hooks (separate ticket)
- Changing the `VaultDetailLayout` shell or header
- Adding user position data (requires wallet connection, out of scope)
- Modifying the YO Treasury page (already has its own dashboard)
- Adding vault allocations chart (stretch goal, not in initial scope)

## Implementation Approach

Follow the existing `createYoClient` + `useQuery` pattern (not `YieldProvider` hooks) to avoid adding provider setup. Use direct recharts imports with Tailwind classes for charts (simpler pattern, matching FlowChart). All new code goes in `packages/web/src/yo-treasury/` to keep YO code isolated.

---

## Phase 1: Data Hook

### Overview
Create a hook that fetches all YO vault detail data from the REST API in parallel queries.

### Changes Required:

#### 1. New hook: `use-yo-vault-detail.ts`

**File**: `packages/web/src/yo-treasury/hooks/use-yo-vault-detail.ts`
**Action**: Create new file

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { createYoClient } from '@yo-protocol/core';
import type { Address } from 'viem';

export function useYoVaultDetail(chainId: number, vaultAddress: Address) {
  const client = createYoClient({ chainId: chainId as 1 | 8453 | 42161 });

  // Vault snapshot (APR, TVL, share price — single point)
  const snapshot = useQuery({
    queryKey: ['yo-vault-snapshot', vaultAddress, chainId],
    queryFn: () => client.getVaultSnapshot(vaultAddress),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // Yield history (time series)
  const yieldHistory = useQuery({
    queryKey: ['yo-vault-yield-history', vaultAddress, chainId],
    queryFn: () => client.getVaultYieldHistory(vaultAddress),
    staleTime: 300_000, // 5 min — historical data doesn't change often
  });

  // TVL history (time series)
  const tvlHistory = useQuery({
    queryKey: ['yo-vault-tvl-history', vaultAddress, chainId],
    queryFn: () => client.getVaultTvlHistory(vaultAddress),
    staleTime: 300_000,
  });

  // Share price history (time series)
  const sharePriceHistory = useQuery({
    queryKey: ['yo-share-price-history', vaultAddress, chainId],
    queryFn: () => client.getSharePriceHistory(vaultAddress),
    staleTime: 300_000,
  });

  // Vault performance (aggregate metrics)
  const performance = useQuery({
    queryKey: ['yo-vault-performance', vaultAddress, chainId],
    queryFn: () => client.getVaultPerformance(vaultAddress),
    staleTime: 60_000,
  });

  return {
    snapshot: snapshot.data,
    yieldHistory: yieldHistory.data,
    tvlHistory: tvlHistory.data,
    sharePriceHistory: sharePriceHistory.data,
    performance: performance.data,
    isLoading: snapshot.isLoading,
    isChartsLoading: yieldHistory.isLoading || tvlHistory.isLoading || sharePriceHistory.isLoading,
  };
}
```

**Note**: The exact shape of `getVaultSnapshot`, `getVaultYieldHistory`, etc. return types needs to be verified at runtime. The hook will be adjusted in Phase 2 once we see the actual API response shapes.

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes
- [ ] File exists at `packages/web/src/yo-treasury/hooks/use-yo-vault-detail.ts`

#### Manual Verification:
- [ ] Hook returns data when used (verify via React DevTools or console.log)

**Implementation Note**: After completing this phase, verify the actual API response shapes before proceeding. The time series types (`TimeseriesPoint[]`, `SharePriceHistoryPoint[]`) need to be confirmed.

---

## Phase 2: YO Vault Metrics Component

### Overview
A branded metrics row showing key YO-specific stats pulled from the vault snapshot.

### Changes Required:

#### 1. New component: `yo-vault-metrics.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-vault-metrics.tsx`
**Action**: Create new file

Renders a 4-column grid of stat cards (reusing the `StatCard` pattern from `portfolio-summary.tsx`):
- **7d APR** — neon accent, from snapshot yield data
- **Share Price** — from snapshot
- **Total Assets** — formatted with asset symbol
- **Performance** — from performance data (e.g., all-time return %)

Skeleton loading state matching existing YO patterns (`bg-yo-dark`, `animate-pulse`, `border-white/5`).

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes

#### Manual Verification:
- [ ] Metrics render with correct values matching yo.xyz for the same vault
- [ ] Skeleton shows during loading
- [ ] Neon accent on APR card

---

## Phase 3: Chart Components

### Overview
Three charts using recharts with YO theming: TVL History (area), Yield History (line), Share Price (area). Follow the direct recharts import pattern from `flow-chart-display.tsx`.

### Changes Required:

#### 1. New component: `yo-vault-charts.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-vault-charts.tsx`
**Action**: Create new file

**Layout**: Two charts side-by-side on desktop (grid-cols-2), stacked on mobile.

Each chart wrapped in a `bg-yo-dark rounded-lg border border-white/5 p-4` card with:
- Title in `text-yo-muted uppercase tracking-wider text-xs`
- `ResponsiveContainer` with `height={240}`
- `AreaChart` or `LineChart` with:
  - `CartesianGrid` using `stroke-muted` (Tailwind class)
  - `XAxis` with date formatting, `fill-muted-foreground` ticks
  - `YAxis` with value formatting
  - `Tooltip` with custom dark-themed content
  - Area/Line in `#D6FF34` (yo-neon) for primary, `#A0A0A0` (yo-muted) for secondary
  - Area fill with gradient from `#D6FF34` opacity 0.2 → 0

**Charts**:
1. **TVL History** — `AreaChart`, yo-neon stroke + gradient fill, formatted as $M/$K
2. **Yield History** — `LineChart`, yo-neon stroke, formatted as %

#### 2. New component: `yo-share-price-chart.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-share-price-chart.tsx`
**Action**: Create new file

Full-width area chart for share price over time. Same card styling as above. Single `AreaChart` with yo-neon stroke + subtle gradient.

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes

#### Manual Verification:
- [ ] TVL chart renders with correct axis labels and tooltip
- [ ] Yield chart renders with % formatting
- [ ] Share price chart renders full width below the two-chart grid
- [ ] All charts responsive on mobile (stack vertically)
- [ ] Skeleton loading states work
- [ ] Charts match YO theme (dark background, neon green lines)

---

## Phase 4: Integration & Wiring

### Overview
Wire the new components into the vault detail page for `yo-vault` tagged vaults.

### Changes Required:

#### 1. New component: `yo-vault-overview.tsx`

**File**: `packages/web/src/yo-treasury/components/yo-vault-overview.tsx`
**Action**: Create new file

Composes all new sections:
```tsx
export function YoVaultOverview({ chainId, vaultAddress }: Props) {
  const detail = useYoVaultDetail(chainId, vaultAddress);

  return (
    <div className="space-y-6 font-yo">
      <YoVaultMetrics snapshot={detail.snapshot} performance={detail.performance} isLoading={detail.isLoading} />
      <YoVaultCharts yieldHistory={detail.yieldHistory} tvlHistory={detail.tvlHistory} isLoading={detail.isChartsLoading} />
      <YoSharePriceChart history={detail.sharePriceHistory} isLoading={detail.isChartsLoading} />
    </div>
  );
}
```

#### 2. Modify page.tsx

**File**: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx`
**Changes**: Add `yo-vault` tag check, render `YoVaultOverview` below `VaultOverviewContent`

```tsx
// After existing yo-treasury check:
const isYoVault = vault?.tags.includes('yo-vault');

return (
  <div className="space-y-6">
    <VaultOverviewContent />
    {isYoVault && (
      <YoVaultOverview
        chainId={Number(chainId) as ChainId}
        vaultAddress={address as Address}
      />
    )}
  </div>
);
```

#### 3. Create ticket for deposit/withdraw migration

**File**: `thoughts/kuba/tickets/fsn_0070-yo-vault-deposit-withdraw-hooks.md`
**Action**: Create new file

Ticket to replace the generic wagmi deposit/withdraw sidebar with `@yo-protocol/react` hooks (`useDeposit`/`useRedeem`) for proper gateway routing on yo-vault pages.

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes
- [ ] File exists: `thoughts/kuba/tickets/fsn_0070-yo-vault-deposit-withdraw-hooks.md`

#### Manual Verification:
- [ ] Visit `http://localhost:3000/vaults/8453/0x50c749ae210d3977adc824ae11f3c7fd10c871e9` (yoEUR)
- [ ] Generic metrics (TVL, Age, Depositors) appear at top
- [ ] YO metrics row (APR, Share Price, Total Assets, Performance) appears below
- [ ] TVL + Yield charts render side-by-side below metrics
- [ ] Share Price chart renders full-width below the two charts
- [ ] All sections use YO dark theme with neon accents
- [ ] Deposit/withdraw sidebar still works (unchanged)
- [ ] Visit other yo-vault URLs (yoUSD, yoETH, yoBTC) — same sections appear
- [ ] Visit non-yo vault URL — no YO sections appear
- [ ] YO Treasury page unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation that the full page looks correct and charts render with real data.

---

## Testing Strategy

### Unit Tests:
- None required — this is read-only UI; data correctness depends on the yo-protocol API

### Manual Testing Steps:
1. Visit each of the 4 yo-vault URLs on Base (yoUSD, yoETH, yoBTC, yoEUR)
2. Verify metrics match yo.xyz dashboard for the same vault
3. Verify charts render with historical data (not empty)
4. Resize browser — confirm responsive layout (charts stack on mobile)
5. Visit a non-yo vault — confirm no YO sections appear
6. Visit the yo-treasury vault — confirm dashboard is unchanged

## Performance Considerations

- All API calls use `staleTime: 60s+` to avoid excessive refetching
- Historical data queries use `staleTime: 300s` since they rarely change
- Charts use `ResponsiveContainer` for efficient resizing
- No new wagmi/RPC calls added — all data from REST API

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0069-yo-vaults-pages-features.md`
- YO theme: `packages/web/src/styles/global.css:76-164`
- Existing data hook pattern: `packages/web/src/yo-treasury/hooks/use-yo-vaults-data.ts`
- Chart pattern: `packages/web/src/flow-chart/components/flow-chart-display.tsx`
- Page entry point: `packages/web/src/app/vaults/[chainId]/[address]/page.tsx`
