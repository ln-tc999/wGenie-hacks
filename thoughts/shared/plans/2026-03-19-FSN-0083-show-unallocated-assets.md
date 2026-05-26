# FSN-0083: Show Unallocated Assets & Improve Allocation Table

## Overview

Improve the Yield Allocations table in the YO Treasury dashboard to show accurate USD values for all columns, add per-vault unallocated balances, and remove the useless Status column. Prices are read from the PlasmaVault price oracle on-chain. TVL data comes from the YO SDK.

## Current State Analysis

**AllocationTable** (`packages/web/src/yo-treasury/components/allocation-table.tsx`) has 5 columns:
- Vault, APR, TVL (USD only), Position (bare assets only), Status (Active/—)

**Price reading**: `use-vault-reads.ts` reads the treasury vault's price oracle for USDC only. No prices for WETH, cbBTC, EURC.

**Unallocated**: `useTreasuryPositions` reads only the treasury's own underlying (USDC) balance — no per-YO-vault underlying balances.

**`portfolio-summary.tsx`**: Uses hardcoded `$1` for USDC, `$1.1` for EURC, gives up on WETH/cbBTC.

### Key Discoveries:

- PlasmaVault oracle supports `getAssetPrice(address)` for any token — can read WETH, cbBTC, EURC prices: `packages/sdk/src/abi/price-oracle-middleware.abi.ts`
- `VaultStatsItem.tvl` from YO SDK is a `FormattedValue` with `raw: string | number` — can get raw TVL number: `@yo-protocol/core/dist/api/types.d.ts:167`
- `YO_VAULTS` config in `use-treasury-positions.ts:10-60` has symbol/decimals but no `underlyingAddress` — must add
- `useYoPrices` hook exists (`use-yo-vaults-data.ts:53`) but ticket requires PlasmaVault oracle, not YO API prices

## Desired End State

The Yield Allocations table shows 5 columns: **Vault, APR, TVL, Position, Unallocated** (Status removed).

For TVL, Position, and Unallocated, each cell shows:
```
0.05 WETH        ← bare asset amount (primary)
$125.00           ← USD value (secondary, smaller text)
```

All USD values use prices from the PlasmaVault price oracle. The PortfolioSummary cards use real per-token prices for accurate total portfolio value.

### How to verify:

1. Open Storybook at `http://localhost:6007` → YO Treasury Chat story
2. The Yield Allocations table shows 5 columns (no Status)
3. TVL shows bare assets + USD for all 4 vaults
4. Position shows bare assets + USD for allocated vaults
5. Unallocated shows per-vault underlying balance + USD
6. PortfolioSummary "Total Value" and "Allocated" cards show accurate USD totals

## What We're NOT Doing

- Not changing the agent tools or Mastra code
- Not modifying deposit/withdraw forms
- Not touching the vault detail pages
- Not adding new tokens beyond the 4 existing YO vault underlyings

## Implementation Approach

1. Add underlying token addresses to `YO_VAULTS` config
2. Extend `useTreasuryPositions` to read per-vault unallocated balances
3. Create `useUnderlyingPrices` hook that reads PlasmaVault oracle for all underlying tokens
4. Update `useYoVaultsData` to expose raw TVL
5. Update `AllocationTable` UI (remove Status, add Unallocated, dual display)
6. Update `PortfolioSummary` to use real prices

## Phase 1: Data Layer Changes

### Overview

Add underlying addresses, read unallocated balances per YO vault, read prices from oracle, expose raw TVL.

### Changes Required:

#### 1. Add `underlyingAddress` to `YO_VAULTS` and read per-vault unallocated balances

**File**: `packages/web/src/yo-treasury/hooks/use-treasury-positions.ts`

Add `underlyingAddress: Address` to each vault config entry:
```typescript
{
  id: 'yoUSD',
  name: 'yoUSD',
  address: '0x0000000f2eb9f69274678c76222b35eec7588a65',
  underlying: 'USDC',
  underlyingAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  underlyingDecimals: 6,
  // ...
},
{
  id: 'yoETH',
  // ...
  underlyingAddress: '0x4200000000000000000000000000000000000006',
},
{
  id: 'yoBTC',
  // ...
  underlyingAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
},
{
  id: 'yoEUR',
  // ...
  underlyingAddress: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
},
```

Add `underlyingAddress` to the `TreasuryPosition` type.

In `pass1Contracts`, replace the single unallocated read with per-vault unallocated reads:
```typescript
// For each YO vault, read balanceOf(underlyingAddress, treasuryAddress)
...yoVaults.map((v) => ({
  chainId,
  address: v.underlyingAddress,
  abi: erc20Abi,
  functionName: 'balanceOf' as const,
  args: [treasuryAddress] as const,
})),
```

Add `unallocatedBalance: bigint` to `TreasuryPosition`. Remove the hook-level `unallocatedBalance` return (it moves into per-position).

Return `positions` where each position includes its own `unallocatedBalance`.

#### 2. Create `useUnderlyingPrices` hook

**File**: `packages/web/src/yo-treasury/hooks/use-underlying-prices.ts` (NEW)

```typescript
'use client';

import { useReadContracts, useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { YO_VAULTS } from './use-treasury-positions';

const plasmaVaultPriceOracleAbi = [/* getPriceOracleMiddleware */] as const;
const getAssetPriceAbi = [/* getAssetPrice */] as const;

export function useUnderlyingPrices({
  chainId,
  vaultAddress, // treasury vault address
}: {
  chainId: number;
  vaultAddress: Address;
}) {
  const yoVaults = YO_VAULTS[chainId] ?? [];

  // Step 1: get price oracle address from treasury vault
  const { data: priceOracleAddress } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: plasmaVaultPriceOracleAbi,
    functionName: 'getPriceOracleMiddleware',
  });

  // Step 2: read price for each unique underlying token
  const uniqueUnderlyings = [...new Set(yoVaults.map((v) => v.underlyingAddress))];

  const contracts = uniqueUnderlyings.map((addr) => ({
    chainId,
    address: priceOracleAddress!,
    abi: getAssetPriceAbi,
    functionName: 'getAssetPrice' as const,
    args: [addr] as const,
  }));

  const { data } = useReadContracts({
    contracts,
    query: { enabled: !!priceOracleAddress },
  });

  // Build Record<lowercase-address, number>
  const prices: Record<string, number> = {};
  uniqueUnderlyings.forEach((addr, i) => {
    const result = data?.[i];
    if (result?.status === 'success') {
      const [price, decimals] = result.result as [bigint, bigint];
      prices[addr.toLowerCase()] = Number(price) / 10 ** Number(decimals);
    }
  });

  return { prices, isLoading: !data };
}
```

#### 3. Add raw TVL to `useYoVaultsData`

**File**: `packages/web/src/yo-treasury/hooks/use-yo-vaults-data.ts`

Add `tvlRaw: number | null` to `YoVaultData`:
```typescript
export interface YoVaultData {
  // existing fields...
  tvlRaw: number | null;
}
```

In the mapping:
```typescript
tvlRaw: typeof v.tvl.raw === 'number' ? v.tvl.raw : v.tvl.raw ? parseFloat(String(v.tvl.raw)) : null,
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors in changed files

#### Manual Verification:
- [ ] Console-log prices hook output in Storybook — shows prices for USDC, WETH, cbBTC, EURC
- [ ] Console-log positions — each has `unallocatedBalance` field

**Implementation Note**: After completing this phase, pause for manual verification that oracle prices are returning correctly for all 4 tokens.

---

## Phase 2: UI Changes

### Overview

Update AllocationTable (remove Status, add Unallocated, dual display for TVL/Position/Unallocated) and PortfolioSummary (real prices).

### Changes Required:

#### 1. Update `TreasuryDashboard` to wire up prices

**File**: `packages/web/src/yo-treasury/components/treasury-dashboard.tsx`

```typescript
import { useUnderlyingPrices } from '../hooks/use-underlying-prices';

// In component:
const { prices } = useUnderlyingPrices({ chainId, vaultAddress });

// Pass to AllocationTable:
<AllocationTable
  chainId={chainId}
  positions={positions}
  vaultsData={vaultsData}
  prices={prices}
  isLoading={isPositionsLoading || isVaultsLoading}
/>

// Pass to PortfolioSummary:
<PortfolioSummary
  positions={positions}
  prices={prices}
  // ... existing props
/>
```

#### 2. Rewrite `AllocationTable`

**File**: `packages/web/src/yo-treasury/components/allocation-table.tsx`

**Props change**: Add `prices: Record<string, number>`.

**Remove**: Status column entirely.

**Column layout**: Vault | APR | TVL | Position | Unallocated

**New helper functions**:
```typescript
function formatDualValue(
  amount: number,
  symbol: string,
  priceUsd: number | undefined,
  decimals: number,
): { primary: string; secondary: string | null } {
  const assetDecimals = decimals <= 6 ? 2 : 6;
  const primary = `${amount.toFixed(assetDecimals)} ${symbol}`;
  const secondary = priceUsd !== undefined
    ? formatUsd(amount * priceUsd)
    : null;
  return { primary, secondary };
}
```

**TVL cell**: Compute bare assets from `tvlRaw / price`, show both:
```typescript
// TVL
const tvlUsd = row.tvlRaw;
const price = prices[row.underlyingAddress?.toLowerCase()];
const tvlAssets = tvlUsd && price ? tvlUsd / price : null;
```

Display:
```tsx
<td className="py-3 text-right">
  <div className="font-mono text-xs text-white">
    {tvlAssets ? `${formatCompact(tvlAssets)} ${row.underlying}` : '—'}
  </div>
  <div className="font-mono text-[10px] text-yo-muted">
    {formatTvl(row.tvl)}
  </div>
</td>
```

**Position cell**: Add USD below bare assets:
```tsx
<td className="py-3 text-right">
  <div className={`font-mono text-xs ${isActive ? 'text-white' : 'text-yo-muted'}`}>
    {formatPosition(row)}
  </div>
  {isActive && price && (
    <div className="font-mono text-[10px] text-yo-muted">
      {formatUsd(Number(row.assetsFormatted) * price)}
    </div>
  )}
</td>
```

**Unallocated cell**: New column showing per-vault unallocated balance:
```tsx
<td className="py-3 pr-4 text-right">
  <div className="font-mono text-xs text-white">
    {formatUnallocated(row)}
  </div>
  {row.unallocatedBalance > 0n && price && (
    <div className="font-mono text-[10px] text-yo-muted">
      {formatUsd(Number(formatUnits(row.unallocatedBalance, row.underlyingDecimals)) * price)}
    </div>
  )}
</td>
```

#### 3. Update `PortfolioSummary` with real prices

**File**: `packages/web/src/yo-treasury/components/portfolio-summary.tsx`

Replace the hardcoded price approximation block with real per-token prices:

```typescript
let allocatedUsd = 0;
for (const pos of activePositions) {
  const amount = Number(pos.assetsFormatted);
  const price = prices[pos.underlyingAddress?.toLowerCase()];
  if (price) {
    allocatedUsd += amount * price;
  }
}
```

Remove `hasNonUsdPositions` check — with real prices, we always have accurate totals.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] No lint errors

#### Manual Verification:
- [ ] Open Storybook YO Treasury Chat story
- [ ] Table has 5 columns: Vault, APR, TVL, Position, Unallocated (no Status)
- [ ] TVL shows bare assets on first line, USD on second line for all 4 vaults
- [ ] Position shows bare assets + USD for allocated vaults, "—" for unallocated
- [ ] Unallocated column shows per-vault underlying balance + USD
- [ ] PortfolioSummary "Total Value" shows accurate USD total (no ~ prefix)
- [ ] PortfolioSummary "Allocated" shows accurate USD sum
- [ ] Cross-check: for yoUSD, position USD ≈ position amount × 1 (since USDC ≈ $1)
- [ ] Cross-check: for yoETH, position USD ≈ position amount × current ETH price

---

## Testing Strategy

### Manual Testing Steps:
1. Open Storybook at `http://localhost:6007/iframe.html?globals=theme:dark&args=&id=yo-treasury-chat--default`
2. Verify table layout — 5 columns, correct headers
3. Verify TVL values — compare with YO Protocol website for each vault
4. Verify Position values — compare USD with `amount × CoinGecko price` for sanity
5. Verify Unallocated — should show non-zero for tokens held in treasury but not allocated
6. Verify PortfolioSummary totals — should equal sum of all positions + unallocated

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0083-show-unallocated-assets.md`
- Previous unallocated work: `thoughts/shared/plans/2026-03-08-FSN-0062-yo-vaults-unallocated-column.md`
- Price oracle ABI: `packages/sdk/src/abi/price-oracle-middleware.abi.ts`
- YO SDK types: `@yo-protocol/core/dist/api/types.d.ts`
- Token addresses: `packages/sdk/src/markets/yo/yo.addresses.ts`
