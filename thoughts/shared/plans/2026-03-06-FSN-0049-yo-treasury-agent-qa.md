# FSN-0049: YO Treasury Agent QA Refinement

## Overview

Refine the YO Treasury Agent implementation (FSN-0048) to make it fully self-contained, upgrade the `@yo-protocol/core` SDK from 0.0.3 to latest (1.0.7+), fix the snapshot data access patterns, restore proper Zod enums, and remove unnecessary coupling with the alpha agent's code.

## Current State Analysis

### What exists:
- `yo-treasury-agent` registered in Mastra Studio with 7 tools (5 yo-treasury + 2 shared alpha)
- `getYoVaultsTool` works but returns null APY/TVL due to SDK v0.0.3 Zod validation bug
- `getTreasuryAllocationTool` imports `readVaultBalances` from alpha — creates tight coupling
- `read-vault-balances.ts` was modified with ERC4626 handling (lines 282-369) — muddies alpha code
- `yo-treasury/types.ts` imports `BalanceSnapshot` from `../alpha/types` — cross-dependency
- `pendingActionSchema` duplicated with `z.string()` instead of proper enums
- Three yo action tools import `simulateOnFork` from alpha — acceptable (generic infra)

### Key Discoveries:
- `@yo-protocol/core` 0.0.3 → 1.0.7: Major upgrade. `formattedValueSchema.raw` now accepts `z.ZodUnion<[z.ZodNumber, z.ZodString]>` — fixes the Zod validation error on `getVaultSnapshot()`
- VaultSnapshot API: APY at `snapshot.stats.yield['7d']`, TVL at `snapshot.stats.tvl.formatted` (not top-level `apy7d`/`tvl`)
- `VaultId` type now includes `'yoGOLD' | 'yoUSDT'` (6 vaults total, was 4)
- Live demo confirms 5 vaults active: yoUSD (5.56%), yoETH (3.27%), yoBTC (1.05%), yoEUR (2.21%), yoGOLD (1.30% on Ethereum)
- New yo-protocol skills available: `yo-design`, `yo-protocol-react`

## Desired End State

After this plan:
1. `@yo-protocol/core` upgraded to latest — `getVaultSnapshot()` returns real APY/TVL data
2. `read-yo-treasury-balances.ts` — standalone function reading ERC4626 + ERC20 balances, no alpha dependency
3. `read-vault-balances.ts` — reverted to pre-FSN-0048 state (Aave/Morpho/Euler only, no `@yo-protocol/core` import)
4. `yo-treasury/types.ts` — self-contained types, no imports from `../alpha/types`
5. `pendingActionSchema` — proper yo-specific enums: `protocol: z.enum(['yo-erc4626', 'yo-swap'])`, `actionType: z.enum(['supply', 'withdraw', 'swap'])`
6. `getYoVaultsTool` — proper typed snapshot access, no `as Record<string, unknown>` hack
7. Agent system prompt updated with yoGOLD vault and corrected data
8. TypeScript compiles cleanly

### Verification:
- `cd packages/mastra && pnpm tsc --noEmit` passes
- Agent loads in Mastra Studio at `http://localhost:4111`
- "What are my yield options?" returns 5 YO vaults with real APY/TVL data (not null)
- No imports from `../alpha/` in any `yo-treasury/` file except `simulateOnFork` (generic infra)

## What We're NOT Doing

- Not creating yo-treasury-specific copies of `displayPendingActionsTool` / `executePendingActionsTool` (shared tools, pure pass-throughs)
- Not creating a yo-treasury-specific `simulateOnFork` (generic infra, acceptable cross-dependency)
- Not changing alpha agent behavior or types
- Not building frontend components (Phase 3)
- Not installing `@yo-protocol/react` package (Phase 3)

## Implementation Approach

Bottom-up: upgrade SDK → create standalone balance reader → revert alpha changes → fix tools → fix types → fix agent prompt → verify.

---

## Phase 1: Upgrade `@yo-protocol/core`

### Overview

Upgrade from 0.0.3 to latest (1.0.7+). This fixes the `getVaultSnapshot()` Zod validation error and gives us proper typed access to APY/TVL data.

### Changes Required:

#### 1. Update package.json versions

**File**: `packages/mastra/package.json`
**Change**: `"@yo-protocol/core": "^0.0.3"` → `"@yo-protocol/core": "^1.0.4"`

**File**: `packages/web/package.json`
**Change**: `"@yo-protocol/core": "^0.0.3"` → `"@yo-protocol/core": "^1.0.4"`

#### 2. Install

```bash
cd /Users/kuba/wgenie-labs/wgenie-monorepo && pnpm install
```

#### 3. Verify no breaking API changes

The SDK API surface is backwards-compatible. The `createYoClient`, `getVaults()`, `getVaultSnapshot()`, and `erc4626Abi` exports all exist in both versions. The main change is:
- `VaultConfig.symbol` type widened: `'yoETH' | 'yoBTC' | 'yoUSD' | 'yoEUR'` → `'yoETH' | 'yoBTC' | 'yoUSD' | 'yoEUR' | 'yoGOLD' | 'yoUSDT'`
- `VaultSnapshot.stats.yield` now properly typed with `'1d' | '7d' | '30d'` keys

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm install` succeeds
- [ ] `cd packages/mastra && pnpm tsc --noEmit` passes (may fail until later phases fix types)

---

## Phase 2: Create standalone `read-yo-treasury-balances.ts`

### Overview

Create a self-contained function that reads a PlasmaVault's ERC20 unallocated tokens and ERC4626 market positions. This replaces the dependency on alpha's `readVaultBalances` for the yo-treasury agent.

### Changes Required:

#### 1. New balance reader

**File**: `packages/mastra/src/tools/yo-treasury/read-yo-treasury-balances.ts` (new)

```typescript
import { type Address, type PublicClient, erc20Abi, formatUnits } from 'viem';
import { erc4626Abi } from '@yo-protocol/core';
import {
  PlasmaVault,
  MARKET_ID,
  substrateToAddress,
} from '@wgenie/fusion-sdk';

/** Minimal ABI for price oracle's getAssetPrice */
const getAssetPriceAbi = [
  {
    type: 'function',
    name: 'getAssetPrice',
    inputs: [{ name: 'asset_', type: 'address', internalType: 'address' }],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export interface TreasuryAsset {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  priceUsd: string;
  valueUsd: string;
}

export interface YoPosition {
  vaultAddress: string;
  vaultSymbol: string;
  shares: string;
  underlyingAddress: string;
  underlyingSymbol: string;
  underlyingDecimals: number;
  underlyingAmount: string;
  underlyingFormatted: string;
  valueUsd: string;
}

export interface TreasuryBalanceSnapshot {
  assets: TreasuryAsset[];
  yoPositions: YoPosition[];
  totalValueUsd: string;
}

/** Check if a market ID represents an ERC4626 market (100_001+) */
function isErc4626MarketId(marketId: bigint): boolean {
  return marketId >= 100_001n && marketId <= 100_999n;
}

/**
 * Read a PlasmaVault's unallocated ERC20 tokens and ERC4626 (YO) positions.
 * Self-contained — does not depend on alpha's readVaultBalances.
 */
export async function readYoTreasuryBalances(
  publicClient: PublicClient,
  vaultAddress: Address,
): Promise<TreasuryBalanceSnapshot> {
  const plasmaVault = await PlasmaVault.create(publicClient, vaultAddress);
  let totalValueUsdFloat = 0;

  // ─── ERC20 unallocated tokens ───

  const substrates = await plasmaVault.getMarketSubstrates(
    MARKET_ID.ERC20_VAULT_BALANCE,
  );

  let assets: TreasuryAsset[] = [];

  if (substrates.length > 0) {
    const tokenAddresses = substrates
      .map((s) => substrateToAddress(s))
      .filter((addr): addr is Address => addr !== undefined);

    if (tokenAddresses.length > 0) {
      const metadataResults = await publicClient.multicall({
        contracts: tokenAddresses.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: 'name' as const },
          { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
          { address: addr, abi: erc20Abi, functionName: 'decimals' as const },
          { address: addr, abi: erc20Abi, functionName: 'balanceOf' as const, args: [plasmaVault.address] },
        ]),
        allowFailure: true,
      });

      const priceResults = await publicClient.multicall({
        contracts: tokenAddresses.map((addr) => ({
          address: plasmaVault.priceOracle,
          abi: getAssetPriceAbi,
          functionName: 'getAssetPrice' as const,
          args: [addr],
        })),
        allowFailure: true,
      });

      assets = tokenAddresses.map((addr, i) => {
        const nameResult = metadataResults[i * 4 + 0];
        const symbolResult = metadataResults[i * 4 + 1];
        const decimalsResult = metadataResults[i * 4 + 2];
        const balanceResult = metadataResults[i * 4 + 3];
        const priceResult = priceResults[i];

        const name = nameResult.status === 'success' ? (nameResult.result as string) : addr;
        const symbol = symbolResult.status === 'success' ? (symbolResult.result as string) : '???';
        const decimals = decimalsResult.status === 'success' ? Number(decimalsResult.result) : 18;
        const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : 0n;
        const balanceFormatted = formatUnits(balance, decimals);

        let priceUsd = '0.00';
        let valueUsd = '0.00';

        if (priceResult.status === 'success') {
          const [rawPrice, rawPriceDecimals] = priceResult.result as [bigint, bigint];
          const pDecimals = Number(rawPriceDecimals);
          const priceFloat = Number(rawPrice) / 10 ** pDecimals;
          priceUsd = priceFloat.toFixed(2);
          if (balance > 0n && rawPrice > 0n) {
            const valueFloat = Number(balance * rawPrice) / 10 ** (decimals + pDecimals);
            valueUsd = valueFloat.toFixed(2);
            totalValueUsdFloat += valueFloat;
          }
        }

        return { address: addr, name, symbol, decimals, balance: balance.toString(), balanceFormatted, priceUsd, valueUsd };
      });
    }
  }

  // ─── ERC4626 (YO vault) positions ───

  const yoPositions: YoPosition[] = [];

  let activeMarketIds: bigint[] = [];
  try {
    const allMarketIds = await plasmaVault.getMarketIds({ include: ['balanceFuses'] });
    activeMarketIds = allMarketIds.filter(
      (id) => id !== MARKET_ID.ERC20_VAULT_BALANCE && isErc4626MarketId(id),
    );
  } catch {
    // If getMarketIds fails, skip
  }

  for (const marketId of activeMarketIds) {
    try {
      const erc4626Substrates = await plasmaVault.getMarketSubstrates(marketId);
      if (erc4626Substrates.length === 0) continue;

      const vaultAddresses = erc4626Substrates
        .map((s) => substrateToAddress(s))
        .filter((a): a is Address => a !== undefined);
      if (vaultAddresses.length === 0) continue;

      // Multicall: balanceOf, symbol, asset for each ERC4626 vault
      const shareResults = await publicClient.multicall({
        contracts: vaultAddresses.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: 'balanceOf' as const, args: [plasmaVault.address] },
          { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
          { address: addr, abi: erc4626Abi, functionName: 'asset' as const },
        ]),
        allowFailure: true,
      });

      for (let i = 0; i < vaultAddresses.length; i++) {
        const balResult = shareResults[i * 3 + 0];
        const symResult = shareResults[i * 3 + 1];
        const assetResult = shareResults[i * 3 + 2];

        const shares = balResult.status === 'success' ? (balResult.result as bigint) : 0n;
        if (shares === 0n) continue;

        const vaultSymbol = symResult.status === 'success' ? (symResult.result as string) : '???';
        const underlyingAddr = assetResult.status === 'success' ? (assetResult.result as Address) : undefined;
        if (!underlyingAddr) continue;

        // Get underlying info and convert shares to assets
        const [convertResult, underlyingSymbolResult, underlyingDecimalsResult, priceResult] = await publicClient.multicall({
          contracts: [
            { address: vaultAddresses[i], abi: erc4626Abi, functionName: 'convertToAssets' as const, args: [shares] },
            { address: underlyingAddr, abi: erc20Abi, functionName: 'symbol' as const },
            { address: underlyingAddr, abi: erc20Abi, functionName: 'decimals' as const },
            { address: plasmaVault.priceOracle, abi: getAssetPriceAbi, functionName: 'getAssetPrice' as const, args: [underlyingAddr] },
          ],
          allowFailure: true,
        });

        const underlyingAmount = convertResult.status === 'success' ? (convertResult.result as bigint) : shares;
        const underlyingSym = underlyingSymbolResult.status === 'success' ? (underlyingSymbolResult.result as string) : '???';
        const underlyingDec = underlyingDecimalsResult.status === 'success' ? Number(underlyingDecimalsResult.result) : 18;

        let valueUsd = 0;
        if (priceResult.status === 'success') {
          const [rawPrice, rawPriceDecimals] = priceResult.result as [bigint, bigint];
          const pDecimals = Number(rawPriceDecimals);
          if (underlyingAmount > 0n && rawPrice > 0n) {
            valueUsd = Number(underlyingAmount * rawPrice) / 10 ** (underlyingDec + pDecimals);
          }
        }

        totalValueUsdFloat += valueUsd;
        yoPositions.push({
          vaultAddress: vaultAddresses[i],
          vaultSymbol,
          shares: shares.toString(),
          underlyingAddress: underlyingAddr,
          underlyingSymbol: underlyingSym,
          underlyingDecimals: underlyingDec,
          underlyingAmount: underlyingAmount.toString(),
          underlyingFormatted: formatUnits(underlyingAmount, underlyingDec),
          valueUsd: valueUsd.toFixed(2),
        });
      }
    } catch {
      // Skip failed market reads
    }
  }

  return {
    assets,
    yoPositions,
    totalValueUsd: totalValueUsdFloat.toFixed(2),
  };
}
```

Key differences from alpha's `readVaultBalances`:
- Only reads ERC20 + ERC4626 markets (no Aave/Morpho/Euler handling)
- `yoPositions` array instead of generic `markets` with `MarketAllocation`
- Self-contained types (`TreasuryAsset`, `YoPosition`, `TreasuryBalanceSnapshot`)
- Filters market IDs to `100_001n–100_999n` range (ERC4626 only)
- No label resolution (Morpho/Euler-specific logic removed)
- Imports `erc4626Abi` from `@yo-protocol/core` (not alpha)

### Success Criteria:

#### Automated Verification:
- [ ] File created and TypeScript compiles

---

## Phase 3: Revert alpha's `read-vault-balances.ts`

### Overview

Remove the ERC4626 handling added in FSN-0048. The alpha agent goes back to only handling Aave V3, Morpho, and Euler V2 markets. The `@yo-protocol/core` dependency is removed from this file.

### Changes Required:

#### 1. Remove ERC4626 imports and helpers

**File**: `packages/mastra/src/tools/alpha/read-vault-balances.ts`

**Remove** line 2:
```typescript
import { erc4626Abi } from '@yo-protocol/core';
```

**Remove** the `isErc4626Market` function (lines 98-101):
```typescript
function isErc4626Market(marketName: string): boolean {
  return marketName.startsWith('ERC4626_') || marketName.startsWith('MARKET_100');
}
```

**Remove** the ERC4626 entries from `formatProtocolName` (line 94):
```typescript
if (marketId.startsWith('ERC4626_') || marketId.startsWith('MARKET_100')) return 'ERC4626';
```

#### 2. Remove ERC4626 branch from market loop

**Remove** the `else if (isErc4626Market(marketName))` block (lines 282-369) and replace with nothing — let it fall through to the existing `else { continue; }`.

The market loop should go back to:
```typescript
if (marketName === 'AAVE_V3' || marketName === 'AAVE_V3_LIDO') {
  // ...
} else if (marketName === 'MORPHO') {
  // ...
} else if (marketName === 'EULER_V2') {
  // ...
} else {
  continue;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles
- [ ] Alpha agent's `getMarketBalancesTool` still works for Aave/Morpho/Euler markets
- [ ] No `@yo-protocol/core` import in any `tools/alpha/` file

---

## Phase 4: Clean up yo-treasury types

### Overview

Make `yo-treasury/types.ts` fully self-contained — no imports from alpha types. Define yo-specific output types.

### Changes Required:

#### 1. Rewrite types.ts

**File**: `packages/mastra/src/tools/yo-treasury/types.ts`

```typescript
import type { TreasuryAsset, YoPosition } from './read-yo-treasury-balances';

/** YO vault info returned by getYoVaultsTool */
export type YoVaultsOutput = {
  type: 'yo-vaults';
  success: boolean;
  chainId: number;
  vaults: Array<{
    symbol: string;
    name: string;
    address: string;
    underlying: string;
    underlyingAddress: string;
    underlyingDecimals: number;
    apy7d: string | null;
    tvl: string | null;
    chains: number[];
  }>;
  message: string;
  error?: string;
};

/** Treasury allocation returned by getTreasuryAllocationTool */
export type TreasuryBalancesOutput = {
  type: 'treasury-balances';
  success: boolean;
  assets: TreasuryAsset[];
  yoPositions: YoPosition[];
  totalValueUsd: string;
  message: string;
  error?: string;
};

/** Action with simulation — yo-specific protocols */
export type YoActionWithSimulationOutput = {
  type: 'action-with-simulation';
  success: boolean;
  protocol: 'yo-erc4626' | 'yo-swap';
  actionType: 'supply' | 'withdraw' | 'swap';
  description: string;
  fuseActions: Array<{
    fuse: string;
    data: string;
  }>;
  error?: string;
  simulation?: {
    success: boolean;
    message: string;
    actionsCount: number;
    fuseActionsCount: number;
    error?: string;
  };
};

/** Union of all YO Treasury tool outputs */
export type YoTreasuryToolOutput =
  | YoVaultsOutput
  | TreasuryBalancesOutput
  | YoActionWithSimulationOutput;
```

Key changes:
- `TreasuryBalancesOutput` replaces the alpha's `MarketBalancesOutput` — uses `yoPositions` instead of generic `markets`
- `type: 'treasury-balances'` discriminator (was `'market-balances'`)
- `YoActionWithSimulationOutput.simulation` no longer references `BalanceSnapshot` from alpha — simplified to just success/message/counts/error (the full balance snapshots are still available in the simulation result but we don't type them here)
- No imports from `../alpha/types`

### Success Criteria:

#### Automated Verification:
- [ ] No imports from `../alpha/types` in `yo-treasury/types.ts`
- [ ] TypeScript compiles

---

## Phase 5: Update `getYoVaultsTool` for new SDK

### Overview

Fix the snapshot data access to use the proper typed API now that the SDK upgrade resolves the Zod validation bug.

### Changes Required:

#### 1. Fix snapshot access

**File**: `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts`

Replace the try/catch hack (lines 41-49):
```typescript
// REMOVE this:
const snap = snapshot as Record<string, unknown>;
if (snap.apy7d != null) apy7d = String(snap.apy7d);
if (snap.tvl != null) tvl = String(snap.tvl);
```

With proper typed access:
```typescript
apy7d = snapshot.stats.yield['7d'];
tvl = snapshot.stats.tvl.formatted;
```

The full vault mapping becomes:
```typescript
vaults.map(async (vault) => {
  let apy7d: string | null = null;
  let tvl: string | null = null;

  try {
    const snapshot = await client.getVaultSnapshot(vault.address);
    apy7d = snapshot.stats.yield['7d'];
    tvl = snapshot.stats.tvl.formatted;
  } catch {
    // Snapshot fetch can fail for new/unpopulated vaults
  }

  return {
    symbol: vault.symbol,
    name: vault.name,
    address: vault.address as string,
    underlying: vault.underlying.symbol,
    underlyingAddress: (vault.underlying.address[chainId as keyof typeof vault.underlying.address] ?? '') as string,
    underlyingDecimals: vault.underlying.decimals,
    apy7d,
    tvl,
    chains: [...vault.chains],
  };
}),
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles
- [ ] No `as Record<string, unknown>` casts in the file

#### Manual Verification:
- [ ] In Mastra Studio, "What are my yield options?" returns real APY/TVL values (not null)

---

## Phase 6: Update `getTreasuryAllocationTool`

### Overview

Switch from alpha's `readVaultBalances` to the new standalone `readYoTreasuryBalances`.

### Changes Required:

#### 1. Update imports and implementation

**File**: `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts`

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readYoTreasuryBalances } from './read-yo-treasury-balances';
import type { TreasuryBalancesOutput } from './types';

export const getTreasuryAllocationTool = createTool({
  id: 'get-treasury-allocation',
  description: `Read the treasury vault's current holdings: unallocated tokens and YO vault allocations.
Shows each token balance, YO vault share positions, and USD values.
Call when the user asks "where are my funds?", "show my portfolio", or "what's my allocation?"`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID'),
  }),
  outputSchema: z.object({
    type: z.literal('treasury-balances'),
    success: z.boolean(),
    assets: z.array(z.any()),
    yoPositions: z.array(z.any()),
    totalValueUsd: z.string(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }): Promise<TreasuryBalancesOutput> => {
    try {
      const publicClient = getPublicClient(chainId);
      const snapshot = await readYoTreasuryBalances(publicClient, vaultAddress as Address);

      const tokenCount = snapshot.assets.length;
      const positionCount = snapshot.yoPositions.length;
      const parts: string[] = [];
      if (tokenCount > 0) parts.push(`${tokenCount} token${tokenCount === 1 ? '' : 's'}`);
      if (positionCount > 0) parts.push(`${positionCount} YO vault position${positionCount === 1 ? '' : 's'}`);

      return {
        type: 'treasury-balances' as const,
        success: true,
        ...snapshot,
        message: parts.length > 0 ? `Treasury holds ${parts.join(' and ')}` : 'Treasury is empty',
      };
    } catch (error) {
      return {
        type: 'treasury-balances' as const,
        success: false,
        assets: [],
        yoPositions: [],
        totalValueUsd: '0.00',
        message: 'Failed to read treasury allocation',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

Key changes:
- Import `readYoTreasuryBalances` from `./read-yo-treasury-balances` (not alpha)
- Import `getPublicClient` stays (it's from `plasma-vault/utils`, not alpha)
- Output type is `'treasury-balances'` (was `'market-balances'`)
- Uses `yoPositions` instead of `markets`

### Success Criteria:

#### Automated Verification:
- [ ] No imports from `../alpha/` in this file
- [ ] TypeScript compiles

---

## Phase 7: Fix `pendingActionSchema` with proper enums

### Overview

Restore proper Zod enums in the yo-treasury agent's working memory schema instead of `z.string()`.

### Changes Required:

#### 1. Update pendingActionSchema

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts`

Replace lines 15-24:
```typescript
// BEFORE (z.string() — too loose):
const pendingActionSchema = z.object({
  id: z.string().describe('Unique ID, e.g. "1", "2"'),
  protocol: z.string().describe('Protocol name (yo-erc4626, yo-swap)'),
  actionType: z.string().describe('Action type (supply, withdraw, swap)'),
  ...
});
```

With proper enums:
```typescript
const pendingActionSchema = z.object({
  id: z.string().describe('Unique ID, e.g. "1", "2"'),
  protocol: z.enum(['yo-erc4626', 'yo-swap']).describe('Protocol name'),
  actionType: z.enum(['supply', 'withdraw', 'swap']).describe('Action type'),
  description: z.string().describe('Human-readable description'),
  fuseActions: z.array(z.object({
    fuse: z.string().describe('Fuse contract address'),
    data: z.string().describe('Hex-encoded calldata'),
  })),
});
```

Note: The shared `displayPendingActionsTool` and `executePendingActionsTool` use `z.string()` for protocol/actionType in their input schemas, which accepts any string value including these enum values. No changes needed there.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles
- [ ] Working memory validates correctly with yo-specific protocol values

---

## Phase 8: Update agent system prompt

### Overview

Add yoGOLD vault to the reference table, update APY examples with live data, and ensure the prompt reflects the separation from alpha tools.

### Changes Required:

#### 1. Update vault reference table

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts`

Update the vault reference table in the system prompt:

```
## YO VAULT REFERENCE (Base, chainId: 8453)

| Vault | Address | Underlying | Slot |
|-------|---------|-----------|------|
| yoUSD | 0x0000000f2eb9f69274678c76222b35eec7588a65 | USDC (6 dec) | 1 |
| yoETH | 0x3a43aec53490cb9fa922847385d82fe25d0e9de7 | WETH (18 dec) | 2 |
| yoBTC | 0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc | cbBTC (8 dec) | 3 |
| yoEUR | 0x50c749ae210d3977adc824ae11f3c7fd10c871e9 | EURC (6 dec) | 4 |

## YO VAULT REFERENCE (Ethereum, chainId: 1)

| Vault | Address | Underlying |
|-------|---------|-----------|
| yoGOLD | (resolve via getYoVaultsTool) | PAXG (18 dec) |

Note: yoGOLD is on Ethereum mainnet, not Base. Always call getYoVaultsTool to get the correct address per chain.
```

#### 2. Update yoVaultId enum in action tools

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts`

Update the inputSchema's `yoVaultId` enum (line 35):
```typescript
// BEFORE:
yoVaultId: z.enum(['yoUSD', 'yoETH', 'yoBTC', 'yoEUR'])
// AFTER:
yoVaultId: z.enum(['yoUSD', 'yoETH', 'yoBTC', 'yoEUR', 'yoGOLD', 'yoUSDT'])
```

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts`

Same change to the `yoVaultId` enum (line 22).

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles

---

## Phase 9: Update barrel export

### Overview

Add the new `read-yo-treasury-balances` export to the barrel file and update type exports.

### Changes Required:

**File**: `packages/mastra/src/tools/yo-treasury/index.ts`

```typescript
export { getYoVaultsTool } from './get-yo-vaults';
export { getTreasuryAllocationTool } from './get-treasury-allocation';
export { createYoAllocationActionTool } from './create-yo-allocation-action';
export { createYoWithdrawActionTool } from './create-yo-withdraw-action';
export { createYoSwapActionTool } from './create-yo-swap-action';
export { readYoTreasuryBalances } from './read-yo-treasury-balances';
export type {
  TreasuryAsset,
  YoPosition,
  TreasuryBalanceSnapshot,
} from './read-yo-treasury-balances';
export type {
  YoTreasuryToolOutput,
  YoVaultsOutput,
  TreasuryBalancesOutput,
  YoActionWithSimulationOutput,
} from './types';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles

---

## Phase 10: Final verification

### Overview

Full TypeScript compilation check and dependency audit.

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && pnpm tsc --noEmit` passes cleanly
- [ ] No `../alpha/types` imports in any `yo-treasury/` file
- [ ] No `../alpha/read-vault-balances` imports in any `yo-treasury/` file
- [ ] Only allowed alpha imports: `simulateOnFork` (in action tools), `displayPendingActionsTool`/`executePendingActionsTool` (in agent)
- [ ] `@yo-protocol/core` version ≥ 1.0.4 in both package.json files

#### Manual Verification:
- [ ] Agent loads in Mastra Studio at `http://localhost:4111`
- [ ] "What are my yield options?" → returns 5 vaults with real APY/TVL
- [ ] "Show my allocation" → returns treasury-balances type (needs real vault to verify fully)

**Implementation Note**: After all automated verification passes, pause for manual testing in Mastra Studio.

---

## Testing Strategy

### Automated:
- TypeScript compilation: `cd packages/mastra && pnpm tsc --noEmit`
- Dependency audit: grep for disallowed imports in yo-treasury files
- Existing alpha agent tests should not be affected (no alpha code modified except reverting ERC4626 additions)

### Manual:
- Mastra Studio agent chat testing
- Verify APY/TVL data is real (not null) after SDK upgrade

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0049-yo-treasury-agent-qa.md`
- Previous plan: `thoughts/shared/plans/2026-03-05-FSN-0048-yo-treasury-agent.md`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
- Demo app: https://yo-protocol-react-example.vercel.app
- New skills repo: https://github.com/yoprotocol/yo-protocol-skills/tree/main/skills
