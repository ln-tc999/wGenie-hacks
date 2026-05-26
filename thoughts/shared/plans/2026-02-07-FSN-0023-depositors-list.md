# FSN-0023: Global Depositors List Page

## Overview

Create a new top-level `/depositors` page that lists all unique depositors across all Fusion vaults. Each row represents a unique wallet address with aggregated data: total balance in USD, number of vaults (with >$10 deposit), and last activity timestamp.

## Current State Analysis

- **Depositor table** in Supabase has 1,860 active records across 1,478 unique addresses and 51 vaults
- **Vault-specific depositors tab** exists at `/vaults/[chainId]/[address]/depositors` with per-row RPC enrichment
- **Price conversion pipeline** exists: `fetchAllVaultsRpcData()` returns `sharePrice` and `assetUsdPrice` per vault (cached 10 min)
- **Top-level pages** follow pattern: layout (SidebarLayout) + server page (fetch + error) + client server-wrapper (AppProviders + header + content)
- **Navigation**: `nav-config.ts` defines sidebar/bottom-nav items (Dashboard, Vaults, Activity)

### Key Discoveries:

- `VaultRpcData` includes `sharePrice` and `assetUsdPrice` — enough to convert share balance to USD: `usdValue = (shareBalance / 10^assetDecimals) * sharePrice * assetUsdPrice`
- BigInt gotcha: Supabase `text` columns may return as JS numbers in scientific notation — must handle `typeof` check before `BigInt()` conversion
- `fetchAllVaultsRpcData()` at `packages/web/src/lib/rpc/vault-rpc-data.ts:167` fetches all vaults in parallel with caching
- Vaults list page uses offset-based pagination with TanStack Table (`vault-data-table.tsx`)
- Activity page uses cursor-based infinite scroll — not applicable here

## Desired End State

A `/depositors` page accessible from the sidebar navigation showing a sortable, filterable, paginated table:

| Depositor Address | Total Balance (USD) | Vaults | Last Activity |
|---|---|---|---|
| 0xf6a9...5569 | $1,234,567 | 22 | Feb 5, 2026 |
| 0xc654...9fb  | $456,789   | 16 | Jan 30, 2026 |

**Filters**: Depositor address search input
**Sort options**: Total Balance (default), Vault Count, Last Activity
**Pagination**: Offset-based, 20 per page

### Verification:
- Navigate to `http://localhost:3000/depositors` — page loads with depositor data
- Sidebar shows "Depositors" nav item between "Vaults List" and "Activity"
- Sorting by each column works correctly
- Depositor address search filters results
- Pagination navigates between pages
- USD values reflect current on-chain prices (via cached RPC data)

## What We're NOT Doing

- No chain or vault filters (depositors are cross-chain entities)
- No per-row RPC enrichment for on-chain balance (server-side aggregation only)
- No click-through to a depositor detail page (future feature)
- No depositor chart or pie chart on this page
- No infinite scroll (offset pagination is sufficient for ~1,478 rows)

## Implementation Approach

Follow the **Vaults List** pattern (server-side fetch → TanStack Table → offset pagination) rather than the Activity pattern (infinite scroll). The server-side fetch function aggregates all depositor positions into per-address rows with USD conversion using cached vault RPC data.

**USD Conversion Chain (server-side):**
```
share_balance (bigint from DB)
  → Number(formatUnits(shareBalance, assetDecimals)) = shareAmount
  → shareAmount * sharePrice = assetAmount
  → assetAmount * assetUsdPrice = usdValue
```

## Phase 1: Server-Side Data Fetching

### Overview

Create the server-side fetch function that queries all depositors from Supabase, aggregates by address, and converts balances to USD.

### Changes Required:

#### 1. Depositor fetch function

**File**: `packages/web/src/depositors/fetch-depositors.ts` (new)

```typescript
import { z } from 'zod';
import { formatUnits, type Address } from 'viem';
import { addressSchema } from '@/lib/schema';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { ERC4626_VAULTS } from '@/lib/vaults-registry';
import { fetchAllVaultsRpcData } from '@/lib/rpc/vault-rpc-data';
import { getCacheKey } from '@/lib/rpc/cache';

// --- Schemas ---

const depositorItemSchema = z.object({
  address: addressSchema,
  totalBalanceUsd: z.number(),
  vaultCount: z.number(),
  lastActivity: z.number(),
});

export type DepositorItem = z.infer<typeof depositorItemSchema>;

const depositorsResponseSchema = z.object({
  depositors: z.array(depositorItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export type DepositorsResponse = z.infer<typeof depositorsResponseSchema>;

// --- Search params ---

export interface DepositorSearchParams {
  sort?: string;       // 'balance' | 'vaults' | 'activity'
  page?: string;
  depositor?: string;  // address search
}

// --- Helpers ---

/**
 * Safely convert a Supabase text/bigint field to a number in asset decimals.
 * Handles the case where Supabase returns JS numbers in scientific notation.
 */
function shareBalanceToDecimal(
  raw: string | number,
  assetDecimals: number,
): number {
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

const PAGE_SIZE = 20;
const MIN_USD_FOR_VAULT_COUNT = 10;

export async function fetchDepositors(
  params: DepositorSearchParams,
): Promise<DepositorsResponse> {
  // 1. Fetch all vault RPC data (cached 10 min)
  const vaultsForRpc = ERC4626_VAULTS.map((v) => ({
    chainId: v.chainId,
    address: v.address as Address,
  }));
  const rpcDataMap = await fetchAllVaultsRpcData(vaultsForRpc);

  // 2. Query all active depositors from Supabase
  const { data: rows } = await supabase
    .from('depositor')
    .select('depositor_address, vault_address, chain_id, share_balance, last_activity')
    .gt('share_balance', '0');

  if (!rows || rows.length === 0) {
    return depositorsResponseSchema.parse({
      depositors: [],
      pagination: { currentPage: 1, totalPages: 0, totalCount: 0, hasNext: false, hasPrevious: false },
    });
  }

  // 3. Aggregate by depositor address
  const aggregated = new Map<string, {
    totalBalanceUsd: number;
    vaultCount: number;
    lastActivity: number;
  }>();

  for (const row of rows) {
    const depositorAddr = row.depositor_address.toLowerCase();
    const rpcKey = getCacheKey(row.chain_id, row.vault_address);
    const rpcData = rpcDataMap.get(rpcKey);

    // Convert share balance to USD
    let usdValue = 0;
    if (rpcData && rpcData.assetDecimals && rpcData.sharePrice && rpcData.assetUsdPrice) {
      const shareAmount = shareBalanceToDecimal(
        String(row.share_balance),
        rpcData.assetDecimals,
      );
      usdValue = shareAmount * rpcData.sharePrice * rpcData.assetUsdPrice;
    }

    const existing = aggregated.get(depositorAddr);
    if (existing) {
      existing.totalBalanceUsd += usdValue;
      if (usdValue >= MIN_USD_FOR_VAULT_COUNT) {
        existing.vaultCount += 1;
      }
      if (row.last_activity > existing.lastActivity) {
        existing.lastActivity = row.last_activity;
      }
    } else {
      aggregated.set(depositorAddr, {
        totalBalanceUsd: usdValue,
        vaultCount: usdValue >= MIN_USD_FOR_VAULT_COUNT ? 1 : 0,
        lastActivity: row.last_activity,
      });
    }
  }

  // 4. Convert to array and apply depositor address filter
  let depositors = Array.from(aggregated.entries()).map(([address, data]) => ({
    address: address as Address,
    ...data,
  }));

  if (params.depositor) {
    const search = params.depositor.trim().toLowerCase();
    depositors = depositors.filter((d) => d.address.includes(search));
  }

  // 5. Sort
  const sort = params.sort || 'balance';
  switch (sort) {
    case 'vaults':
      depositors.sort((a, b) => b.vaultCount - a.vaultCount || b.totalBalanceUsd - a.totalBalanceUsd);
      break;
    case 'activity':
      depositors.sort((a, b) => b.lastActivity - a.lastActivity);
      break;
    case 'balance':
    default:
      depositors.sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd);
      break;
  }

  // 6. Paginate
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const totalCount = depositors.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;
  const paged = depositors.slice(offset, offset + PAGE_SIZE);

  return depositorsResponseSchema.parse({
    depositors: paged,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  });
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Function can be imported and called from a test page

#### Manual Verification:
- [ ] Calling `fetchDepositors({})` returns ~1,478 depositors with USD values
- [ ] USD values are reasonable (match TVL data from vault pages)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Page Route & Layout

### Overview

Create the Next.js page at `/depositors` with the standard layout pattern (SidebarLayout + AppProviders), server-side data fetching, and navigation integration.

### Changes Required:

#### 1. Layout

**File**: `packages/web/src/app/depositors/layout.tsx` (new)

Follow the Activity layout pattern at `packages/web/src/app/activity/layout.tsx`.

```typescript
'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function DepositorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/depositors';

  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
```

#### 2. Server page

**File**: `packages/web/src/app/depositors/page.tsx` (new)

Follow the Vaults page pattern at `packages/web/src/app/vaults/page.tsx`.

```typescript
import {
  fetchDepositors,
  type DepositorSearchParams,
} from '@/depositors/fetch-depositors';
import { DepositorsServer } from './depositors-server';

export const metadata = {
  title: 'Depositors - Fusion by wGenie',
};

interface PageProps {
  searchParams: Promise<DepositorSearchParams>;
}

export default async function DepositorsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  try {
    const data = await fetchDepositors(params);

    return (
      <DepositorsServer
        initialData={data}
        searchParams={params}
      />
    );
  } catch {
    return (
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Depositors
            </h1>
            <p className="text-muted-foreground">
              Explore depositors across wGenie Fusion vaults
            </p>
          </div>
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Unable to load depositor data. Please try again.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
```

#### 3. Server wrapper (client component)

**File**: `packages/web/src/app/depositors/depositors-server.tsx` (new)

Follow the Activity server pattern at `packages/web/src/app/activity/activity-server.tsx`.

```typescript
'use client';

import { AppProviders } from '@/app/app-providers';
import { DepositorsContent } from '@/depositors/depositors-content';
import type {
  DepositorsResponse,
  DepositorSearchParams,
} from '@/depositors/fetch-depositors';

interface Props {
  initialData: DepositorsResponse;
  searchParams: DepositorSearchParams;
}

export function DepositorsServer({ initialData, searchParams }: Props) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Depositors
            </h1>
            <p className="text-muted-foreground">
              Explore depositors across wGenie Fusion vaults
            </p>
          </div>

          {/* Content */}
          <DepositorsContent
            depositors={initialData.depositors}
            pagination={initialData.pagination}
            searchParams={searchParams}
          />
        </div>
      </div>
    </AppProviders>
  );
}
```

#### 4. Add to navigation

**File**: `packages/web/src/components/sidebar/nav-config.ts`

Add "Depositors" nav item between "Vaults List" and "Activity":

```typescript
import { Home, Vault, Activity, Users, type LucideIcon } from 'lucide-react';

export const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Vaults List', url: '/vaults', icon: Vault },
  { title: 'Depositors', url: '/depositors', icon: Users },
  { title: 'Activity', url: '/activity', icon: Activity },
];
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors

#### Manual Verification:
- [ ] `http://localhost:3000/depositors` renders the page with header
- [ ] Sidebar shows "Depositors" nav item with Users icon
- [ ] Bottom nav (mobile) shows "Depositors"
- [ ] Active state highlights correctly when on `/depositors`

**Implementation Note**: After completing this phase, pause for manual browser verification before proceeding.

---

## Phase 3: Table, Filters & Pagination

### Overview

Build the depositors content component with TanStack Table, address search filter, sort select, and offset pagination — following the Vaults List page pattern.

### Changes Required:

#### 1. Content component

**File**: `packages/web/src/depositors/depositors-content.tsx` (new)

Follow the VaultDirectoryContent pattern at `packages/web/src/vault-directory/vault-directory-content.tsx`.

```typescript
'use client';

import { DepositorsDataTable } from './components/depositors-data-table';
import { DepositorsFilterBar } from './components/depositors-filter-bar';
import { DepositorsPagination } from './components/depositors-pagination';
import { DepositorsSortSelect } from './components/depositors-sort-select';
import type {
  DepositorItem,
  DepositorSearchParams,
} from './fetch-depositors';

interface Props {
  depositors: DepositorItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  searchParams: DepositorSearchParams;
}

export function DepositorsContent({
  depositors,
  pagination,
  searchParams,
}: Props) {
  const currentSort = searchParams.sort || 'balance';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <DepositorsFilterBar searchParams={searchParams} />
          <span className="text-sm text-muted-foreground">
            {pagination.totalCount.toLocaleString()}{' '}
            {pagination.totalCount === 1 ? 'depositor' : 'depositors'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <DepositorsSortSelect value={currentSort} />
        </div>
      </div>

      {/* Table */}
      <DepositorsDataTable depositors={depositors} currentSort={currentSort} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <DepositorsPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
}
```

#### 2. Column definitions

**File**: `packages/web/src/depositors/components/depositors-columns.tsx` (new)

Follow the vault-columns pattern at `packages/web/src/vault-directory/components/vault-columns.tsx`.

Columns:
- **Depositor Address**: `Account` component with address (no chainId since cross-chain)
- **Total Balance**: USD formatted with `formatCurrency`, sortable header
- **Vaults**: Count with ">$10" qualifier, sortable header
- **Last Activity**: Formatted date, sortable header

#### 3. Data table

**File**: `packages/web/src/depositors/components/depositors-data-table.tsx` (new)

Follow the vault-data-table pattern at `packages/web/src/vault-directory/components/vault-data-table.tsx`. No row click-through (no depositor detail page yet).

#### 4. Filter bar (depositor address search)

**File**: `packages/web/src/depositors/components/depositors-filter-bar.tsx` (new)

Single filter: depositor address search input with form submit, following the activity filter bar's depositor input pattern at `packages/web/src/activity/components/activity-filter-bar.tsx:147-159`.

#### 5. Sort select

**File**: `packages/web/src/depositors/components/depositors-sort-select.tsx` (new)

Follow the sort-select pattern at `packages/web/src/vault-directory/components/sort-select.tsx`.

Options:
- Total Balance (default)
- Vault Count
- Last Activity

#### 6. Pagination

**File**: `packages/web/src/depositors/components/depositors-pagination.tsx` (new)

Reuse the exact VaultPagination pattern from `packages/web/src/vault-directory/components/vault-pagination.tsx` — same smart page number generation, URL-based navigation.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors

#### Manual Verification:
- [ ] Table displays depositor rows with Address, Total Balance (USD), Vaults count, Last Activity
- [ ] Sorting works for all three columns (balance, vaults, activity)
- [ ] Depositor address search filters results correctly
- [ ] Pagination shows correct page count and navigates between pages
- [ ] Empty state shows when no depositors match search
- [ ] USD values are reasonable (top depositors should have significant balances)
- [ ] Page is responsive on mobile

**Implementation Note**: After completing this phase, use Playwright MCP to test the page in the browser. Verify all columns render, sorting works, and pagination navigates correctly.

---

## Testing Strategy

### Manual Testing Steps:
1. Navigate to `http://localhost:3000/depositors`
2. Verify table loads with depositor data (should show ~1,478 rows paginated)
3. Check top depositor has the highest USD balance
4. Sort by "Vault Count" — top depositor should have 22 vaults
5. Sort by "Last Activity" — most recent activity should be today/yesterday
6. Search for a known depositor address (e.g., `0xf6a9bd`) — should filter to 1 result
7. Clear search — full list returns
8. Navigate to page 2, 3, etc. — data changes correctly
9. Check sidebar nav: "Depositors" appears with Users icon
10. Check mobile bottom nav: "Depositors" appears
11. Resize to mobile — table should be scrollable horizontally

## Performance Considerations

- **~1,860 DB rows** fetched and aggregated in JS — acceptable for server-side
- **RPC data** cached for 10 minutes via in-memory cache — no additional RPC calls if warm
- **Full aggregation on every request** — with ~1,860 rows this is fast (<100ms)
- If row count grows significantly (>10K), consider a materialized view or caching the aggregated result

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0023-depositors-list.md`
- Vault list page pattern: `packages/web/src/app/vaults/page.tsx`
- Activity page pattern: `packages/web/src/app/activity/page.tsx`
- Price conversion: `packages/web/src/lib/rpc/vault-rpc-data.ts:118-145`
- Depositor DB schema: `packages/ponder/ponder.schema.ts:138-153`
