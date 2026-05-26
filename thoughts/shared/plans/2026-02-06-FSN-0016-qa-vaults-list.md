# Fix Issues And Refactor Vaults List Page — Implementation Plan

## Overview

Fix and refactor the Vaults List page to show correct USD-denominated values (via on-chain price oracle), improve column layout (merge asset into vault name with token/chain icons), add an asset-denominated TVL column, and restructure filters so the most-used ones are visible above the table.

## Current State Analysis

### TVL Calculation — THE BUG
The current TVL is **not in USD**. `fetch-vaults.ts:197-200` reads `totalAssets` from the ERC4626 contract and converts it with `formatUnits(rpcData.totalAssets, rpcData.assetDecimals)`. This gives the value in the vault's underlying asset (e.g., 1,000,000 USDC, 0.5 WBTC). The `formatCurrency()` function then adds a `$` prefix, which is misleading for non-stablecoin vaults (a WBTC vault showing "$0.5" when it actually holds $50K worth of BTC).

### Net Flow — Same Bug
`fetch-vaults.ts:202-206` converts `netFlow7d` the same way — in asset units, not USD. Displayed with `$` prefix.

### Column Layout
- `vault-columns.tsx`: 6 columns: **Asset** | **Vault Name** | **TVL** | **Depositors** | **Net Flow (7d)** | **Created**
- Asset column (line 52-59) shows `ChainIcon` + `Badge` with asset symbol
- Vault Name column (line 62-66) shows only the vault name text, no link
- Table rows are clickable via an overlay link in `vault-data-table.tsx:77-83`

### Activity Page Pattern (to reuse)
- `activity-columns.tsx:52-57` shows `ChainIcon` + `TokenIcon` + vault name link — this is the pattern the ticket asks us to follow

### Filter Layout
- ALL 6 filters (TVL Range, Depositor Count, Net Flow, Underlying Assets, Chains, Protocols) are inside a single `VaultFilterPopover` dropdown labeled "Filters"
- Ticket asks to move Net Flow, Underlying Asset, Chains, Protocols **above the table** as visible filters
- Keep TVL Range and Depositor Count in a "More filters" dropdown

### Price Oracle
- Each vault has a `getPriceOracleMiddleware()` function → returns oracle address
- Oracle's `getAssetPrice(assetAddress)` → returns `(price: uint256, decimals: uint256)` tuple
- SDK's `PlasmaVault.getTvl()` at `PlasmaVault.ts:337-343` does: `tvl = (totalAssets_18 * assetUsdPrice_18) / ONE_ETHER`
- Web package does NOT currently use this

### Key Discoveries:
- `vault-rpc-data.ts` already fetches `totalAssets`, `assetDecimals`, `assetAddress` — we need to add `priceOracleAddress` and `assetUsdPrice` to its output
- The FSN-0015 plan creates `packages/web/src/lib/rpc/asset-prices.ts` — if that's implemented first, we reuse it; if not, we create the price-fetching logic here
- `VaultRpcData` interface at `vault-rpc-data.ts:11-18` needs to be extended with `tvlUsd: number`
- The `VaultData` type at `fetch-vaults.ts:13-25` has `tvl: z.number()` which currently holds asset-unit values

## Desired End State

After implementation:
1. **TVL column** shows correct USD values (fetched via price oracle)
2. **Net Flow (7d) column** shows USD values
3. **New "TVL (Asset)" column** shows TVL in native asset units (e.g., "1.5M USDC", "45.2 WBTC")
4. **Vault column** shows `ChainIcon` + `TokenIcon` + vault name as a link (asset column removed)
5. **Column header** renamed from "Vault Name" to "Vault"
6. **Filters**: Net Flow, Underlying Asset, Chains, Protocols visible above table; TVL Range and Depositor Count in "More filters" popover
7. All data fetched server-side, cached (existing 10-minute cache)

### Verification:
- TVL for stablecoin vaults (USDC, USDT) ≈ same as before (1:1 with USD)
- TVL for non-stablecoin vaults (WBTC, stETH, WETH) shows correct USD value (significantly different from asset-unit value)
- All filter interactions work correctly
- No TypeScript errors, no broken layouts

## What We're NOT Doing

- NOT using the SDK package directly from the web app (no workspace dependency change)
- NOT calling `updateMarketsBalances` before `totalAssets` (the web already reads totalAssets without it; SDK does it for higher accuracy with accrued interest, but we accept the simpler approach)
- NOT adding price oracle calls at the individual vault page level (only vaults list for this ticket)
- NOT changing the VaultCard component layout (it's for mobile and can be updated in a follow-up)

## Implementation Approach

**Strategy**: Extend the existing `fetchVaultRpcData()` to also fetch the price oracle and asset USD price in the same multicall flow. Then use the price to compute `tvlUsd` and `netFlow7dUsd` in `fetchVaults()`. For columns, merge the asset info into the Vault column and add a separate asset-denominated TVL column. For filters, split the popover into visible filters (above table) and a "More filters" dropdown.

---

## Phase 1: Price Oracle Integration in RPC Data

### Overview
Extend `fetchVaultRpcData()` to also fetch the vault's price oracle address and the asset's USD price, then compute `tvlUsd`.

### Changes Required:

#### 1. Extend VaultRpcData interface and fetcher

**File**: `packages/web/src/lib/rpc/vault-rpc-data.ts`

Add two new fields to `VaultRpcData`:

```typescript
export interface VaultRpcData {
  totalAssets: bigint;
  totalSupply: bigint;
  assetAddress: Address;
  assetSymbol: string;
  assetDecimals: number;
  sharePrice: number;
  assetUsdPrice: number;  // NEW: USD price per 1 unit of asset
  tvlUsd: number;         // NEW: TVL in USD
}
```

Add minimal ABI entries at the top of the file:

```typescript
const plasmaVaultPriceOracleAbi = [
  { inputs: [], name: 'getPriceOracleMiddleware', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
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
```

In `fetchVaultRpcData()`, after the existing two multicalls, add a third phase:

```typescript
// Phase 3: Fetch price oracle and asset USD price
let assetUsdPrice = 0;
let tvlUsd = 0;
try {
  const priceOracleAddress = await fetchWithRetry(() =>
    client.readContract({
      address: vaultAddress,
      abi: plasmaVaultPriceOracleAbi,
      functionName: 'getPriceOracleMiddleware',
    }),
  );

  const [rawPrice, priceDecimals] = await fetchWithRetry(() =>
    client.readContract({
      address: priceOracleAddress,
      abi: priceOracleAbi,
      functionName: 'getAssetPrice',
      args: [assetAddress],
    }),
  );

  assetUsdPrice = Number(formatUnits(rawPrice, Number(priceDecimals)));
  tvlUsd = Number(formatUnits(totalAssets, assetDecimals)) * assetUsdPrice;
} catch (error) {
  console.error(`Failed to fetch price for ${chainId}:${vaultAddress}`, error);
  // Fall back to 0 — display will show $0 which is better than wrong number
}
```

Update `DEFAULT_RPC_DATA` to include `assetUsdPrice: 0` and `tvlUsd: 0`.

#### 2. Update fetch-vaults.ts to use USD values

**File**: `packages/web/src/vault-directory/fetch-vaults.ts`

Update the `vaultDataSchema` to include new fields:

```typescript
const vaultDataSchema = z.object({
  chainId: chainIdSchema,
  address: addressSchema,
  name: z.string(),
  protocol: z.string(),
  tvlUsd: z.number(),                    // RENAMED from tvl
  tvlAsset: z.number(),                  // NEW: TVL in asset units
  underlyingAsset: z.string(),
  underlyingAssetAddress: addressSchema,
  depositorCount: z.number(),
  netFlow7d: z.number(),                 // Now in USD
  netFlow7dAsset: z.number(),            // NEW: net flow in asset units (for display)
  creationDate: z.string().transform((str) => new Date(str)),
  sharePrice: z.number(),
});
```

In the `enrichedVaults` mapping (line 191-225), change TVL computation:

```typescript
const tvlAsset = rpcData && rpcData.assetDecimals
  ? Number(formatUnits(rpcData.totalAssets, rpcData.assetDecimals))
  : 0;

const tvlUsd = rpcData?.tvlUsd ?? 0;

let netFlow7dAsset = 0;
let netFlow7d = 0;
if (dbData && rpcData && rpcData.assetDecimals && dbData.netFlow7d !== null) {
  const formatted = Number(formatUnits(dbData.netFlow7d, rpcData.assetDecimals));
  netFlow7dAsset = Number.isNaN(formatted) ? 0 : formatted;
  netFlow7d = netFlow7dAsset * (rpcData.assetUsdPrice || 0);
}

return {
  // ... existing fields ...
  tvlUsd,
  tvlAsset,
  netFlow7d,
  netFlow7dAsset,
  // ...
};
```

Update all filter/sort logic to use `tvlUsd` instead of `tvl`:
- Line 229-234: TVL range filter uses `tvlUsd`
- Line 265: Sort by `tvlUsd`

Update `fetchVaultsMetadata()` similarly to compute `maxTvl` from USD values.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Start dev server: `cd packages/web && pnpm dev`
- [ ] Navigate to `/vaults` — page loads without errors
- [ ] TVL values for stablecoin vaults (USDC/USDT) are roughly the same as before
- [ ] TVL values for non-stablecoin vaults (WBTC, stETH) show realistic USD amounts (not raw asset amounts)
- [ ] Console shows no errors from price oracle calls

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Column Restructuring

### Overview
Remove the Asset column, merge asset info (token icon, chain icon) into the Vault column, rename header to "Vault", add a new "TVL (Asset)" column.

### Changes Required:

#### 1. Update vault-columns.tsx

**File**: `packages/web/src/vault-directory/components/vault-columns.tsx`

Import `TokenIcon`:
```typescript
import { TokenIcon } from '@/components/token-icon';
```

**Remove** the `underlyingAsset` column (lines 52-59).

**Replace** the `name` column (lines 62-66) with:

```typescript
{
  accessorKey: 'name',
  header: () => 'Vault',
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <ChainIcon chainId={row.original.chainId} className="w-5 h-5" />
      <TokenIcon
        chainId={row.original.chainId}
        address={row.original.underlyingAssetAddress}
        className="w-5 h-5"
      />
      <span className="font-medium">{row.original.name}</span>
    </div>
  ),
},
```

**Update** the TVL column to use `tvlUsd`:

```typescript
{
  accessorKey: 'tvlUsd',
  header: () => (
    <SortableHeader column="tvl" label="TVL" currentSort={currentSort} align="right" />
  ),
  cell: ({ row }) => (
    <div className="text-right font-mono">
      {formatCurrency(row.original.tvlUsd)}
    </div>
  ),
},
```

**Add** a new "TVL (Asset)" column after TVL:

```typescript
{
  id: 'tvlAsset',
  header: () => <div className="text-right">TVL (Asset)</div>,
  cell: ({ row }) => (
    <div className="text-right font-mono">
      {formatCompactAsset(row.original.tvlAsset)}
      <span className="text-muted-foreground ml-1">{row.original.underlyingAsset}</span>
    </div>
  ),
},
```

Add a helper function at the top of the file:

```typescript
function formatCompactAsset(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 1) return amount.toFixed(2);
  return amount.toPrecision(4);
}
```

**Update** the Net Flow column to use `netFlow7d` (now in USD):

```typescript
{
  accessorKey: 'netFlow7d',
  header: () => <div className="text-right">Net Flow (7d)</div>,
  cell: ({ row }) => {
    const flow = row.original.netFlow7d;
    const isPositive = flow >= 0;
    return (
      <div className={`text-right ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
        {isPositive ? '+' : '-'}
        {formatCurrency(Math.abs(flow))}
      </div>
    );
  },
},
```

Final column order: **Vault** | **TVL** | **TVL (Asset)** | **Depositors** | **Net Flow (7d)** | **Created**

#### 2. Update vault-card.tsx (mobile view)

**File**: `packages/web/src/vault-directory/components/vault-card.tsx`

Update to use `tvlUsd` for the TVL display and `netFlow7d` (USD) for net flow. Add asset symbol to TVL display. This is a minor update — just change `vault.tvl` → `vault.tvlUsd` references.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Navigate to `/vaults` — table shows new column layout
- [ ] Vault column shows chain icon + token icon + vault name
- [ ] TVL column shows USD values with `$` prefix
- [ ] TVL (Asset) column shows asset amounts with symbol (e.g., "1.5M USDC")
- [ ] Net Flow shows USD values with +/- and color coding
- [ ] No broken layouts or overlapping text

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Filter Layout Restructuring

### Overview
Move Net Flow, Underlying Asset, Chains, and Protocols filters to be visible above the table. Keep TVL Range and Depositor Count in a "More filters" popover.

### Changes Required:

#### 1. Create visible filter bar component

**File**: `packages/web/src/vault-directory/components/vault-filter-bar.tsx` (new file)

Create a new component that renders the four visible filters in a horizontal row above the table:

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { NetFlowFilter } from './filters/net-flow-filter';
import { UnderlyingAssetFilter } from './filters/underlying-asset-filter';
import { ChainFilter } from './filters/chain-filter';
import { ProtocolFilter } from './filters/protocol-filter';
import type { VaultsMetadata } from '@/vault-directory/fetch-vaults';
import type { NetFlowOption } from '@/vault-directory/vault-directory.types';

interface Props {
  metadata: VaultsMetadata;
}

export function VaultFilterBar({ metadata }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const netFlow = (searchParams.get('net_flow') || 'all') as NetFlowOption;
  const assets = searchParams.get('underlying_assets')?.split(',').filter(Boolean) || [];
  const chains = searchParams.get('chains')?.split(',').filter(Boolean).map(Number) || [];
  const protocols = searchParams.get('protocols')?.split(',').filter(Boolean) || [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete('page');
    startTransition(() => { router.push(`?${params.toString()}`); });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <NetFlowFilter
        value={netFlow}
        onChange={(option) => updateFilters({ net_flow: option === 'all' ? null : option })}
      />
      <UnderlyingAssetFilter
        value={assets}
        onChange={(selected) => updateFilters({ underlying_assets: selected.length > 0 ? selected.join(',') : null })}
        options={metadata.assets.map((a) => a.symbol)}
      />
      <ChainFilter
        value={chains}
        onChange={(selected) => updateFilters({ chains: selected.length > 0 ? selected.join(',') : null })}
        options={metadata.chains}
      />
      <ProtocolFilter
        value={protocols}
        onChange={(selected) => updateFilters({ protocols: selected.length > 0 ? selected.join(',') : null })}
        options={metadata.protocols}
      />
    </div>
  );
}
```

#### 2. Update VaultFilterPopover — rename and keep only TVL Range + Depositor Count

**File**: `packages/web/src/vault-directory/components/vault-filter-popover.tsx`

- Change the button label from "Filters" to "More filters"
- Remove the Net Flow, Underlying Assets, Chains, and Protocols sections from the popover
- Keep only TVL Range and Depositor Count filters
- Update `activeFilterCount` computation to only count TVL and Depositor filters

Remove imports for `NetFlowFilter`, `UnderlyingAssetFilter`, `ChainFilter`, `ProtocolFilter` and the corresponding `NetFlowOption` type.

Remove the handlers: `handleNetFlowChange`, `handleAssetsChange`, `handleChainsChange`, `handleProtocolsChange`.

Remove the corresponding JSX sections from the popover content.

Update the button text:
```tsx
<Filter className="h-4 w-4" />
More filters
```

#### 3. Update VaultDirectoryContent to include the filter bar

**File**: `packages/web/src/vault-directory/vault-directory-content.tsx`

Import and render `VaultFilterBar` above the toolbar:

```tsx
import { VaultFilterBar } from './components/vault-filter-bar';

// In the JSX, add the filter bar:
<div className="space-y-4">
  {/* Visible Filters */}
  <VaultFilterBar metadata={metadata} />

  {/* Toolbar (More filters popover + sort + count) */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-center gap-4">
      <VaultFilterPopover
        metadata={metadata}
        activeFilterCount={moreFilterCount}
      />
      <span className="text-sm text-muted-foreground">
        {pagination.totalCount.toLocaleString()}{' '}
        {pagination.totalCount === 1 ? 'vault' : 'vaults'}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sort by:</span>
      <SortSelect value={currentSort} />
    </div>
  </div>

  {/* Table */}
  <VaultDataTable vaults={vaults} currentSort={currentSort} />

  {/* Pagination */}
  {pagination.totalPages > 1 && (
    <VaultPagination currentPage={currentPage} totalPages={pagination.totalPages} />
  )}
</div>
```

Update `activeFilterCount` split — `moreFilterCount` counts only TVL and Depositor filters:

```typescript
const moreFilterCount = [
  searchParams.tvl_min || searchParams.tvl_max,
  searchParams.depositors_min || searchParams.depositors_max,
].filter(Boolean).length;
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] Net Flow, Underlying Asset, Chains, and Protocols filters are visible above the table
- [ ] "More filters" dropdown contains only TVL Range and Depositor Count
- [ ] All filter interactions work: selecting a chain filters the table, clearing works, etc.
- [ ] URL params update correctly for all filters
- [ ] Filter badge count on "More filters" button only counts TVL/Depositor filters
- [ ] Responsive layout — filters wrap nicely on smaller screens

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:
- No new unit tests needed — changes are to data fetching and UI layout, tested via manual verification

### Manual Testing Steps:
1. Start dev server: `cd packages/web && pnpm dev`
2. Navigate to `/vaults`
3. **TVL correctness**: Compare TVL for a WBTC vault — should be in the tens of thousands of USD, not "0.5"
4. **TVL (Asset) column**: Shows native amounts with asset symbol
5. **Net Flow**: Shows USD values with +/- coloring
6. **Vault column**: Shows chain icon + token icon + vault name (no separate Asset column)
7. **Filter bar**: Net Flow, Asset, Chain, Protocol filters visible above table
8. **More filters**: Only TVL Range and Depositor Count in the popover
9. **Sorting**: TVL sort works correctly with USD values
10. **Pagination**: Still works after filter changes

## Performance Considerations

- **Additional RPC calls**: Each vault now makes 2 extra RPC calls (getPriceOracleMiddleware + getAssetPrice). With ~20 vaults, that's ~40 extra calls, but they're parallelized per-chain and cached for 10 minutes.
- **Cache TTL**: The existing 10-minute cache in `cache.ts` applies to the full `VaultRpcData` including the new price data. This means prices update every 10 minutes, which is acceptable for a list page.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0016-qa-vaults-list.md`
- SDK PlasmaVault.getTvl(): `packages/sdk/src/PlasmaVault.ts:337-343`
- Price Oracle ABI: `packages/sdk/src/abi/price-oracle-middleware.abi.ts:147-168`
- Vault RPC data: `packages/web/src/lib/rpc/vault-rpc-data.ts`
- Vault columns: `packages/web/src/vault-directory/components/vault-columns.tsx`
- Activity columns pattern: `packages/web/src/activity/components/activity-columns.tsx:52-57`
- Related plan (price utility): `thoughts/shared/plans/2026-02-06-FSN-0015-global-inflow-chart.md`
