# Dashboard Best/Worst & Rankings Implementation Plan

## Overview

Add three new ranking sections to the dashboard page below the existing metrics and flow chart:
1. **Top 10 / Bottom 10 vaults** by 7-day deposit volume (USD) — side by side
2. **10 largest deposits / 10 largest withdrawals** in last 7 days — side by side
3. **10 largest depositors** by current balance (USD)

All data is fetched server-side in the `DashboardPage` component, following existing patterns.

## Current State Analysis

The dashboard page (`packages/web/src/app/(dashboard)/page.tsx`) currently has:
- `DashboardMetrics` — 5 metric cards (TVL, Vaults, Depositors, Net Flow, Volume)
- `DashboardFlowChart` — interactive flow chart (client-side)

Data sources already available:
- **Bucket tables** (`deposit_buckets_2_hours`, `withdraw_buckets_2_hours`) — per-vault 7d deposit/withdrawal sums
- **Event tables** (`deposit_event`, `withdrawal_event`) — individual transactions with `assets`, `timestamp`, `chain_id`, `vault_address`
- **Depositor table** (`depositor`) — current `share_balance` per depositor per vault
- **RPC data** (`fetchAllVaultsRpcData`, `fetchAllAssetPrices`) — asset decimals, USD prices, share prices, vault names

Existing helpers: `bucketSumToUsd()`, `shareBalanceToDecimal()`, `formatCurrency()`, `getExplorerTxUrl()`, `truncateHex()`, `getVaultFromRegistry()`.

## Desired End State

The dashboard page at `http://localhost:3001/` shows three new sections below the flow chart:

1. Two side-by-side tables: "Top 10 Vaults (7d Deposits)" and "Bottom 10 Vaults (7d Deposits)" — each showing rank, vault name, chain, and 7d deposit volume in USD
2. Two side-by-side tables: "Largest Deposits (7d)" and "Largest Withdrawals (7d)" — each showing rank, vault name, amount in USD, depositor address (truncated), tx hash linked to block explorer, and vault name linked to vault detail page
3. One table: "Top 10 Depositors" — showing rank, depositor address, total balance in USD, vault count

### Verification:
- Navigate to `http://localhost:3001/` and confirm all 3 sections render with real data
- Vault names link to `/vaults/{chainId}/{address}`
- Tx hashes link to block explorers
- Tables are responsive on mobile (stack vertically)

## What We're NOT Doing

- No client-side interactivity (time range pickers, sorting, pagination) — these are static server-rendered tables
- No new API routes — all data fetched server-side in the page component
- No new Supabase queries beyond what existing patterns support
- No caching beyond what already exists in `fetchAllVaultsRpcData` / `fetchAllAssetPrices` (10-min TTL)

## Implementation Approach

Create one new server-side fetch function `fetchDashboardRankings()` that fetches all three datasets in parallel, reusing existing RPC/price data. Create three presentational components for the UI sections. All components are server components (no `'use client'`).

---

## Phase 1: Data Fetching

### Overview
Create `fetchDashboardRankings()` that returns vault rankings, largest transactions, and top depositors.

### Changes Required:

#### 1. New fetch function

**File**: `packages/web/src/dashboard/fetch-dashboard-rankings.ts` (new)

This function:
1. Fetches RPC data, asset prices, bucket data, depositor data, and recent deposit/withdrawal events in parallel
2. **Vault rankings**: Aggregates 7d deposit bucket sums per vault into USD, sorts desc for top 10 and asc (non-zero) for bottom 10
3. **Largest transactions**: Queries `deposit_event` and `withdrawal_event` for last 7 days ordered by `timestamp DESC` (up to 1000 rows each — Supabase default limit), enriches with USD amounts using RPC data, sorts by USD amount desc, takes top 10 each
4. **Top depositors**: Aggregates depositor share balances to USD across vaults (reusing `fetchDepositors` pattern), sorts desc, takes top 10

```typescript
import { formatUnits, type Address } from 'viem';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { ERC4626_VAULTS, getVaultFromRegistry } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { fetchAllAssetPrices } from '@/lib/rpc/asset-prices';
import { getCacheKey } from '@/lib/rpc/cache';
import { BUCKET_SIZE, getBucketId } from '@/lib/buckets';
import { getUnixTime, subDays } from 'date-fns';

// --- Types ---

export interface VaultRanking {
  vaultAddress: string;
  chainId: number;
  vaultName: string;
  deposit7dUsd: number;
}

export interface LargestTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  chainId: number;
  vaultAddress: string;
  vaultName: string;
  depositorAddress: string;
  amountUsd: number;
  assetAmount: string;
  assetSymbol: string;
  transactionHash: string;
  timestamp: number;
}

export interface TopDepositor {
  address: string;
  totalBalanceUsd: number;
  vaultCount: number;
}

export interface DashboardRankings {
  topVaults: VaultRanking[];
  bottomVaults: VaultRanking[];
  largestDeposits: LargestTransaction[];
  largestWithdrawals: LargestTransaction[];
  topDepositors: TopDepositor[];
}

// --- Helpers (same pattern as fetch-dashboard-metrics.ts) ---

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

function shareBalanceToDecimal(raw: string | number, assetDecimals: number): number {
  if (typeof raw === 'number') {
    return raw / 10 ** assetDecimals;
  }
  try {
    return Number(formatUnits(BigInt(raw), assetDecimals));
  } catch {
    return 0;
  }
}

// --- Main fetch ---

export async function fetchDashboardRankings(): Promise<DashboardRankings> {
  const vaults = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address as Address,
  }));

  // 7d time range
  const now = getUnixTime(new Date());
  const endBucketId = getBucketId(now, '2_HOURS');
  const startBucketId = endBucketId - 84 * BUCKET_SIZE['2_HOURS'];
  const sevenDaysAgo = getUnixTime(subDays(new Date(), 7));

  // Parallel fetch all data sources
  const [rpcDataMap, assetPrices, depositBuckets, depositEvents, withdrawEvents, depositorRows] =
    await Promise.all([
      fetchAllVaultsRpcData(vaults),
      fetchAllAssetPrices(),
      // Buckets for vault rankings
      supabase
        .from('deposit_buckets_2_hours')
        .select('vault_address, chain_id, sum')
        .gte('bucket_id', startBucketId),
      // Recent deposit events (last 7d)
      supabase
        .from('deposit_event')
        .select('id, chain_id, vault_address, receiver, assets, timestamp, transaction_hash')
        .gte('timestamp', sevenDaysAgo)
        .order('timestamp', { ascending: false })
        .limit(1000),
      // Recent withdrawal events (last 7d)
      supabase
        .from('withdrawal_event')
        .select('id, chain_id, vault_address, owner, assets, timestamp, transaction_hash')
        .gte('timestamp', sevenDaysAgo)
        .order('timestamp', { ascending: false })
        .limit(1000),
      // Current depositor balances
      supabase
        .from('depositor')
        .select('depositor_address, vault_address, chain_id, share_balance')
        .gt('share_balance', '0'),
    ]);

  // --- 1. Vault Rankings by 7d Deposit Volume ---
  const vaultDepositMap = new Map<string, { chainId: number; vaultName: string; total: number }>();

  // Initialize all vaults with 0
  for (const vault of ERC4626_VAULTS) {
    const key = `${vault.chainId}:${vault.address.toLowerCase()}`;
    vaultDepositMap.set(key, { chainId: vault.chainId, vaultName: vault.name, total: 0 });
  }

  for (const row of depositBuckets.data ?? []) {
    const key = `${row.chain_id}:${String(row.vault_address).toLowerCase()}`;
    const priceInfo = assetPrices.get(key);
    if (!priceInfo) continue;
    const usd = bucketSumToUsd(row.sum, priceInfo.assetDecimals, priceInfo.usdPrice, priceInfo.priceDecimals);
    const existing = vaultDepositMap.get(key);
    if (existing) existing.total += usd;
  }

  const allVaultRankings: VaultRanking[] = Array.from(vaultDepositMap.entries()).map(
    ([key, data]) => ({
      vaultAddress: key.split(':')[1]!,
      chainId: data.chainId,
      vaultName: data.vaultName,
      deposit7dUsd: data.total,
    }),
  );

  // Top 10 (highest deposits)
  const topVaults = [...allVaultRankings]
    .sort((a, b) => b.deposit7dUsd - a.deposit7dUsd)
    .slice(0, 10);

  // Bottom 10 (lowest non-zero deposits, or include zeros)
  const bottomVaults = [...allVaultRankings]
    .sort((a, b) => a.deposit7dUsd - b.deposit7dUsd)
    .slice(0, 10);

  // --- 2. Largest Individual Transactions ---
  const enrichTransaction = (
    row: { id: string; chain_id: number; vault_address: string; assets: string; timestamp: number; transaction_hash: string },
    depositorAddress: string,
    type: 'deposit' | 'withdraw',
  ): LargestTransaction | null => {
    const rpcKey = getCacheKey(row.chain_id, row.vault_address);
    const rpcData = rpcDataMap.get(rpcKey);
    if (!rpcData) return null;

    const assetAmount = Number(formatUnits(BigInt(row.assets), rpcData.assetDecimals));
    const amountUsd = assetAmount * rpcData.assetUsdPrice;

    const vaultInfo = getVaultFromRegistry(row.chain_id, row.vault_address);

    return {
      id: row.id,
      type,
      chainId: row.chain_id,
      vaultAddress: row.vault_address,
      vaultName: vaultInfo?.name ?? 'Unknown Vault',
      depositorAddress,
      amountUsd,
      assetAmount: String(row.assets),
      assetSymbol: rpcData.assetSymbol,
      transactionHash: row.transaction_hash,
      timestamp: row.timestamp,
    };
  };

  const enrichedDeposits = (depositEvents.data ?? [])
    .map((d) => enrichTransaction(d, d.receiver, 'deposit'))
    .filter((d): d is LargestTransaction => d !== null);

  const enrichedWithdrawals = (withdrawEvents.data ?? [])
    .map((w) => enrichTransaction(w, w.owner, 'withdraw'))
    .filter((w): w is LargestTransaction => w !== null);

  const largestDeposits = enrichedDeposits
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, 10);

  const largestWithdrawals = enrichedWithdrawals
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, 10);

  // --- 3. Top Depositors by Current Balance ---
  const depositorMap = new Map<string, { totalBalanceUsd: number; vaultCount: number }>();

  for (const row of depositorRows.data ?? []) {
    const depositorAddr = (row.depositor_address as string).toLowerCase();
    const rpcKey = getCacheKey(row.chain_id, row.vault_address);
    const rpcData = rpcDataMap.get(rpcKey);

    let usdValue = 0;
    if (rpcData && rpcData.assetDecimals && rpcData.assetUsdPrice) {
      const shareAmount = shareBalanceToDecimal(String(row.share_balance), rpcData.assetDecimals);
      usdValue = shareAmount * rpcData.sharePrice * rpcData.assetUsdPrice;
    }

    const existing = depositorMap.get(depositorAddr);
    if (existing) {
      existing.totalBalanceUsd += usdValue;
      if (usdValue >= 10) existing.vaultCount += 1;
    } else {
      depositorMap.set(depositorAddr, {
        totalBalanceUsd: usdValue,
        vaultCount: usdValue >= 10 ? 1 : 0,
      });
    }
  }

  const topDepositors = Array.from(depositorMap.entries())
    .map(([address, data]) => ({ address, ...data }))
    .sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd)
    .slice(0, 10);

  return {
    topVaults,
    bottomVaults,
    largestDeposits,
    largestWithdrawals,
    topDepositors,
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] No lint errors: `pnpm --filter web lint`

#### Manual Verification:
- [ ] Function returns valid data when called from dashboard page

---

## Phase 2: UI Components

### Overview
Create three new components for the ranking sections using existing shadcn Table and Card patterns.

### Changes Required:

#### 1. Vault Rankings Component (side-by-side)

**File**: `packages/web/src/dashboard/components/dashboard-vault-rankings.tsx` (new)

Server component showing two side-by-side tables: top 10 and bottom 10 vaults by 7d deposits.

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { getChainName } from '@/lib/vaults-registry';
import type { VaultRanking } from '@/dashboard/fetch-dashboard-rankings';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

function VaultRankingTable({
  title,
  icon,
  vaults,
}: {
  title: string;
  icon: React.ReactNode;
  vaults: VaultRanking[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Vault</TableHead>
              <TableHead className="text-right">Chain</TableHead>
              <TableHead className="text-right pr-6">7d Deposits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaults.map((vault, i) => (
              <TableRow key={`${vault.chainId}:${vault.vaultAddress}`}>
                <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <Link
                    href={`/vaults/${vault.chainId}/${vault.vaultAddress}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {vault.vaultName}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {getChainName(vault.chainId)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono">
                  {formatCurrency(vault.deposit7dUsd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function DashboardVaultRankings({
  topVaults,
  bottomVaults,
}: {
  topVaults: VaultRanking[];
  bottomVaults: VaultRanking[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <VaultRankingTable
        title="Top 10 Vaults (7d Deposits)"
        icon={<TrendingUpIcon className="h-4 w-4 text-green-600" />}
        vaults={topVaults}
      />
      <VaultRankingTable
        title="Bottom 10 Vaults (7d Deposits)"
        icon={<TrendingDownIcon className="h-4 w-4 text-red-600" />}
        vaults={bottomVaults}
      />
    </div>
  );
}
```

#### 2. Largest Transactions Component (side-by-side)

**File**: `packages/web/src/dashboard/components/dashboard-largest-transactions.tsx` (new)

Server component showing two side-by-side tables: largest deposits and largest withdrawals.

Each row includes:
- Rank
- Vault name (linked to `/vaults/{chainId}/{address}`)
- Amount in USD
- Depositor address (truncated)
- Tx hash linked to block explorer

Since `TxHashLink` and `DepositorAddress` are client components (they use `useState` for copy), and this is a server component, we'll render simplified versions inline using `truncateHex` and `getExplorerTxUrl` as plain `<a>` tags.

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { truncateHex } from '@/lib/truncate-hex';
import { getExplorerTxUrl } from '@/lib/get-explorer-tx-url';
import type { LargestTransaction } from '@/dashboard/fetch-dashboard-rankings';
import type { Address } from 'viem';
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, ExternalLinkIcon } from 'lucide-react';

function TransactionTable({
  title,
  icon,
  transactions,
}: {
  title: string;
  icon: React.ReactNode;
  transactions: LargestTransaction[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Vault</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Depositor</TableHead>
              <TableHead className="text-right pr-6">Tx</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx, i) => (
              <TableRow key={tx.id}>
                <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <Link
                    href={`/vaults/${tx.chainId}/${tx.vaultAddress}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {tx.vaultName}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(tx.amountUsd)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-sm text-muted-foreground">
                    {truncateHex(tx.depositorAddress as Address, 4)}
                  </span>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <a
                    href={getExplorerTxUrl(tx.transactionHash as Address, tx.chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                    title="View on block explorer"
                  >
                    <span className="font-mono text-sm">{truncateHex(tx.transactionHash as Address, 4)}</span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function DashboardLargestTransactions({
  largestDeposits,
  largestWithdrawals,
}: {
  largestDeposits: LargestTransaction[];
  largestWithdrawals: LargestTransaction[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TransactionTable
        title="Largest Deposits (7d)"
        icon={<ArrowDownToLineIcon className="h-4 w-4 text-green-600" />}
        transactions={largestDeposits}
      />
      <TransactionTable
        title="Largest Withdrawals (7d)"
        icon={<ArrowUpFromLineIcon className="h-4 w-4 text-red-600" />}
        transactions={largestWithdrawals}
      />
    </div>
  );
}
```

#### 3. Top Depositors Component

**File**: `packages/web/src/dashboard/components/dashboard-top-depositors.tsx` (new)

Server component showing a single table of top 10 depositors.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { truncateHex } from '@/lib/truncate-hex';
import type { TopDepositor } from '@/dashboard/fetch-dashboard-rankings';
import type { Address } from 'viem';
import { UsersIcon } from 'lucide-react';

export function DashboardTopDepositors({
  depositors,
}: {
  depositors: TopDepositor[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <UsersIcon className="h-4 w-4" />
          Top 10 Depositors by Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right pr-6">Vaults</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depositors.map((depositor, i) => (
              <TableRow key={depositor.address}>
                <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {truncateHex(depositor.address as Address, 6)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(depositor.totalBalanceUsd)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  {depositor.vaultCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] No lint errors: `pnpm --filter web lint`

---

## Phase 3: Integration

### Overview
Wire the new components into the dashboard page and fetch rankings data in parallel with existing metrics.

### Changes Required:

#### 1. Update Dashboard Page

**File**: `packages/web/src/app/(dashboard)/page.tsx`

```tsx
import { fetchDashboardMetrics } from '@/dashboard/fetch-dashboard-metrics';
import { fetchDashboardRankings } from '@/dashboard/fetch-dashboard-rankings';
import { DashboardMetrics } from '@/dashboard/components/dashboard-metrics';
import { DashboardFlowChart } from '@/dashboard/dashboard-flow-chart';
import { DashboardVaultRankings } from '@/dashboard/components/dashboard-vault-rankings';
import { DashboardLargestTransactions } from '@/dashboard/components/dashboard-largest-transactions';
import { DashboardTopDepositors } from '@/dashboard/components/dashboard-top-depositors';

export default async function DashboardPage() {
  const [metrics, rankings] = await Promise.all([
    fetchDashboardMetrics(),
    fetchDashboardRankings(),
  ]);

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
      <DashboardVaultRankings
        topVaults={rankings.topVaults}
        bottomVaults={rankings.bottomVaults}
      />
      <DashboardLargestTransactions
        largestDeposits={rankings.largestDeposits}
        largestWithdrawals={rankings.largestWithdrawals}
      />
      <DashboardTopDepositors depositors={rankings.topDepositors} />
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] No lint errors: `pnpm --filter web lint`
- [ ] Dev server starts: `pnpm --filter web dev`

#### Manual Verification:
- [ ] Navigate to `http://localhost:3001/` — all 3 new sections visible below the flow chart
- [ ] Top 10 / Bottom 10 vault tables render side-by-side on desktop, stacked on mobile
- [ ] Vault names link to `/vaults/{chainId}/{address}`
- [ ] Largest transactions show amount in USD with vault links and block explorer tx links
- [ ] Top depositors table shows truncated addresses with balance and vault count
- [ ] Data looks correct (largest deposits should be recognizable amounts)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Phase 4: Browser Testing with Playwright

### Overview
Use Playwright MCP to verify the dashboard renders correctly in a real browser.

### Changes Required:
No code changes — this phase is purely verification.

### Steps:
1. Navigate to `http://localhost:3001/`
2. Take a screenshot
3. Verify the 3 new sections are visible
4. Click a vault name link, verify navigation to vault detail page
5. Click a tx hash link, verify it opens block explorer

### Success Criteria:

#### Manual Verification:
- [ ] All sections render with data in Playwright browser
- [ ] Links work correctly
- [ ] Layout is responsive (test with browser resize)

---

## Testing Strategy

### Manual Testing Steps:
1. Start dev server: `pnpm --filter web dev`
2. Navigate to `http://localhost:3001/`
3. Verify all 5 metric cards still render (regression check)
4. Verify flow chart still renders (regression check)
5. Scroll down to see vault rankings — confirm 10 rows each, side-by-side
6. Verify vault names are clickable and navigate correctly
7. Scroll to largest transactions — confirm 10 rows each
8. Verify tx hash links open block explorers in new tabs
9. Scroll to top depositors — confirm 10 rows
10. Resize browser to mobile width — verify tables stack vertically

## Performance Considerations

- `fetchDashboardRankings()` runs in parallel with `fetchDashboardMetrics()` via `Promise.all()` — total page load time = max of the two, not sum
- Both functions share the same RPC cache (10-min TTL) — if metrics fetched first, rankings reuses cached data
- Supabase queries for events limited to 1000 rows — sufficient for finding top 10 by amount within 7 days
- No additional client-side JS — all new components are server-rendered

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0025-dashboard-bests-worsts.md`
- Existing dashboard metrics: `packages/web/src/dashboard/fetch-dashboard-metrics.ts`
- Existing depositors pattern: `packages/web/src/depositors/fetch-depositors.ts`
- Block explorer helpers: `packages/web/src/lib/get-explorer-tx-url.ts`
