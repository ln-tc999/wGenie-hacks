# YO Treasury Agent (Phase 2) — Implementation Plan

**Status: IMPLEMENTED** (2026-03-06)

All 5 phases complete. Agent registered in Mastra Studio, tested with `getYoVaultsTool`. Remaining Phase 2 testing items (allocation, swap, withdraw) require a real treasury vault on Base.

### Files Created:
- `packages/mastra/src/tools/yo-treasury/types.ts`
- `packages/mastra/src/tools/yo-treasury/index.ts`
- `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts`
- `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts`
- `packages/mastra/src/tools/yo-treasury/create-yo-swap-action.ts`
- `packages/mastra/src/agents/yo-treasury-agent.ts`

### Files Modified:
- `packages/mastra/src/tools/alpha/read-vault-balances.ts` (ERC4626 market support)
- `packages/mastra/src/tools/alpha/types.ts` (relaxed protocol/actionType enums)
- `packages/mastra/src/tools/alpha/display-pending-actions.ts` (relaxed enums)
- `packages/mastra/src/tools/alpha/execute-pending-actions.ts` (relaxed enums)
- `packages/mastra/src/agents/index.ts` (added export)
- `packages/mastra/src/mastra/index.ts` (registered agent)

## Overview

Build the `yo-treasury-agent` Mastra agent with tools that read YO vault data via `@yo-protocol/core`, read the Fusion vault's ERC4626 market positions, create allocation/withdrawal/swap actions, simulate on Anvil, and pass to the UI for execution. The agent handles alpha actions only (allocate to YO vaults, swap assets, withdraw from YO vaults). Deposit/withdraw from the treasury vault itself is handled by the web UI (Phase 3).

## Current State Analysis

### What exists:
- SDK yo market module at `packages/sdk/src/markets/yo/` — ABIs, addresses, constants, vault creation library (`create-vault.ts:65-244`)
- Fork test proving full lifecycle (5/5 tests pass at block 42755236)
- `@yo-protocol/core` v0.0.3 installed in `packages/mastra` and `packages/web` — **not yet used**
- Alpha agent pattern established (`packages/mastra/src/agents/alpha-agent.ts`) with 6 tools, working memory, Anvil simulation
- `readVaultBalances` (`packages/mastra/src/tools/alpha/read-vault-balances.ts:118-348`) handles Aave V3, Morpho, Euler V2 markets — **does NOT handle ERC4626 markets (100_001-100_012)**

### Key discoveries:
- `readVaultBalances` at line 257-275 switches on `marketName` and skips unknown markets via `continue`. ERC4626 market IDs (100_001n etc.) resolve to `MARKET_100001` via `getMarketName()` which hits the fallback at line 75.
- No SDK class exists for ERC4626 `getBalances()` — unlike AaveV3/Morpho/EulerV2 which have dedicated classes. Must read balances manually via `erc4626Abi.convertToAssets(balanceOf(vault))`.
- `@yo-protocol/core` exports `createYoClient({ chainId })` with `getVaults()`, `getVaultSnapshot(address)`, `getVaultYieldHistory()`, `getVaultState()` — all the data we need for vault info tools.
- `simulateOnFork` (`packages/mastra/src/tools/alpha/simulate-on-fork.ts:50`) is fully generic — works with any FuseActions. Reusable as-is.
- `executePendingActionsTool` and `displayPendingActionsTool` are pure pass-throughs with hardcoded protocol enums (`'aave-v3' | 'morpho' | 'euler-v2'`). Need to extend with `'yo-erc4626' | 'yo-swap'`.

## Desired End State

After this plan is complete:
1. `packages/mastra/src/agents/yo-treasury-agent.ts` — new agent with system prompt and working memory
2. `packages/mastra/src/tools/yo-treasury/` — 5 new tools + types + barrel export
3. `packages/mastra/src/tools/alpha/read-vault-balances.ts` — extended to handle ERC4626 markets
4. `packages/mastra/src/mastra/index.ts` — registers `yoTreasuryAgent`
5. Agent testable via Mastra Studio at `http://localhost:4111` (agentId: `yo-treasury-agent`)

### Verification:
- `cd packages/mastra && pnpm tsc --noEmit` passes
- Agent loads in Mastra Studio without errors
- "What are my yield options?" returns YO vault data with APY/TVL
- "Show my allocation" reads ERC4626 market balances from a test vault
- "Allocate 50 USDC to yoUSD" creates correct FuseAction + simulates
- "Withdraw from yoUSD" creates YoRedeemFuse exit action + simulates
- "Swap 10 USDC to WETH" calls Odos API and creates swap FuseAction

## What We're NOT Doing

- No frontend components (Phase 3)
- No API routes in `packages/web` (Phase 3)
- No tool renderers (Phase 3)
- No compound swap+allocate as a single tool (agent composes this by calling swap tool then allocation tool sequentially — the execute tool flattens them)
- No multi-chain in first pass (Base only, addresses exist only for Base)
- No YoRedeemFuse deployment to Base (fork test deploys dynamically; agent simulation does the same)
- No async/queued redemption handling (instant only)

## Implementation Approach

Bottom-up: types -> read-only tools -> action tools -> agent -> registration. Follow alpha agent pattern exactly, adapting for YO-specific semantics.

---

## Phase 1: Extend `readVaultBalances` for ERC4626 Markets

### Overview

The shared `readVaultBalances` function reads ERC20 balances and market positions but skips ERC4626 markets (100_001+). Extend it to read ERC4626 vault shares and convert to underlying asset values. This benefits both the YO treasury agent and the alpha agent (any vault with ERC4626 allocations).

### Changes Required:

#### 1. Add ERC4626 market handling

**File**: `packages/mastra/src/tools/alpha/read-vault-balances.ts` (modify)

Add an ERC4626 branch in the `for (const marketName of marketIdSet)` loop (after line 273, before the `else { continue; }` at line 274).

The ERC4626 market detection: market names starting with `MARKET_100` or matching `ERC4626_XXXX` pattern. Specifically, check if the `marketId` bigint is in the 100_001n-100_012n range.

For each ERC4626 market:
1. Get substrates via `plasmaVault.getMarketSubstrates(marketId)` — each substrate is a padded YO vault address
2. For each substrate, read:
   - `erc20.balanceOf(plasmaVault.address)` on the YO vault (shares held)
   - `erc4626.convertToAssets(shares)` on the YO vault (underlying value)
   - `erc20.symbol()` on the YO vault
   - `erc4626.asset()` on the YO vault to get underlying token
   - `erc20.symbol()` and `erc20.decimals()` on the underlying token
3. Get USD price via `priceOracle.getAssetPrice(underlyingToken)`
4. Format as `MarketSubstrateBalance`-compatible positions

```typescript
// Detection: market IDs 100_001n through 100_012n are ERC4626
const marketId = activeMarketIds.find(id => getMarketName(id) === marketName);
if (marketName.startsWith('MARKET_100') || marketName.startsWith('ERC4626_')) {
  // This is an ERC4626 market — read share balances and convert to assets
  const erc4626MarketId = marketId!;
  const erc4626Substrates = await plasmaVault.getMarketSubstrates(erc4626MarketId);

  if (erc4626Substrates.length === 0) continue;

  const vaultAddresses = erc4626Substrates
    .map(s => substrateToAddress(s))
    .filter((a): a is Address => a !== undefined);

  // Multicall: balanceOf, convertToAssets, symbol, asset for each vault
  const shareResults = await publicClient.multicall({
    contracts: vaultAddresses.flatMap(addr => [
      { address: addr, abi: erc20Abi, functionName: 'balanceOf', args: [plasmaVault.address] },
      { address: addr, abi: erc20Abi, functionName: 'symbol' },
      { address: addr, abi: erc4626Abi, functionName: 'asset' },
    ]),
    allowFailure: true,
  });

  // For each vault with shares > 0, convert to assets and get underlying info
  // ... (full implementation in the code)

  // Build positions array and push to markets
}
```

The label for each position should be the YO vault symbol (e.g., "yoUSD", "yoETH").

#### 2. Add imports

Add `erc4626Abi` import from viem and the `ERC4626_MARKET_ID` from `@wgenie/fusion-sdk`.

#### 3. Add protocol name mapping

In `formatProtocolName()` at line 79, add entries for ERC4626 markets:

```typescript
// Add inside the names record:
MARKET_100001: 'YO (yoUSD)',
MARKET_100002: 'YO (yoETH)',
MARKET_100003: 'YO (yoBTC)',
MARKET_100004: 'YO (yoEUR)',
```

Or more generically, detect market IDs >= 100_001 and format as "ERC4626" protocol.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] Existing alpha agent tests still work (no regression)
- [ ] `readVaultBalances` returns ERC4626 market positions when vault has YO allocations

#### Manual Verification:
- [ ] In Mastra Studio, alpha agent's `getMarketBalancesTool` shows YO vault positions for a test vault with ERC4626 allocations

**Implementation Note**: This is a shared improvement. Complete this before building YO-specific tools.

---

## Phase 2: Tool Output Types

### Overview

Define the discriminated union for all YO Treasury tool outputs. Follow the alpha agent's `types.ts` pattern.

### Changes Required:

#### 1. Type Definitions

**File**: `packages/mastra/src/tools/yo-treasury/types.ts` (new)

```typescript
/** YO vault info returned by getYoVaultsTool */
export type YoVaultsOutput = {
  type: 'yo-vaults';
  success: boolean;
  chainId: number;
  vaults: Array<{
    id: string;           // e.g., 'yoUSD'
    name: string;         // e.g., 'YO USD'
    address: string;
    underlying: string;   // e.g., 'USDC'
    underlyingAddress: string;
    underlyingDecimals: number;
    apy7d: string | null;
    tvl: string | null;
    chains: number[];
  }>;
  message: string;
  error?: string;
};

/** Treasury allocation — reuses MarketBalancesOutput from alpha types */
// We reuse the same 'market-balances' type from alpha tools since
// getTreasuryAllocationTool calls readVaultBalances which returns
// the same BalanceSnapshot shape. The UI renders it with the same
// MarketBalancesList component.

/** Action with simulation — extend alpha pattern for YO protocols */
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
    balancesBefore?: import('../alpha/types').BalanceSnapshot;
    balancesAfter?: import('../alpha/types').BalanceSnapshot;
    error?: string;
  };
};

/** Union of all YO Treasury tool outputs */
export type YoTreasuryToolOutput =
  | YoVaultsOutput
  | YoActionWithSimulationOutput;
// Note: treasury allocation uses 'market-balances' type from alpha
// Note: pending-actions and execute-actions types from alpha are reused
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles

---

## Phase 3: Read-Only Tools

### Overview

Build two read-only tools: one to list YO vaults with APY/TVL data, and one to read the treasury vault's current allocation.

### Changes Required:

#### 1. Get YO Vaults Tool

**File**: `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` (new)

Uses `@yo-protocol/core` to fetch vault snapshots. This is the first usage of the YO SDK in the codebase.

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createYoClient } from '@yo-protocol/core';
import type { YoVaultsOutput } from './types';

export const getYoVaultsTool = createTool({
  id: 'get-yo-vaults',
  description: `List available YO Protocol vaults with current APY, TVL, and underlying asset info.
Call this when the user asks about yield options, available vaults, or "where can I earn yield?"`,
  inputSchema: z.object({
    chainId: z.number().describe('Chain ID (8453=Base, 1=Ethereum, 42161=Arbitrum)'),
  }),
  outputSchema: z.object({
    type: z.literal('yo-vaults'),
    success: z.boolean(),
    chainId: z.number(),
    vaults: z.array(z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      underlying: z.string(),
      underlyingAddress: z.string(),
      underlyingDecimals: z.number(),
      apy7d: z.string().nullable(),
      tvl: z.string().nullable(),
      chains: z.array(z.number()),
    })),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ chainId }) => {
    try {
      const client = createYoClient({ chainId: chainId as 1 | 8453 | 42161 });
      const vaults = client.getVaults();

      const vaultData = await Promise.all(
        vaults.map(async (vault) => {
          try {
            const snapshot = await client.getVaultSnapshot(vault.address);
            return {
              id: vault.id,
              name: vault.name,
              address: vault.address,
              underlying: vault.underlying.symbol,
              underlyingAddress: vault.underlying.address[chainId] ?? '',
              underlyingDecimals: vault.underlying.decimals,
              apy7d: snapshot?.apy7d ?? null,
              tvl: snapshot?.tvl ?? null,
              chains: vault.chains,
            };
          } catch {
            return {
              id: vault.id,
              name: vault.name,
              address: vault.address,
              underlying: vault.underlying.symbol,
              underlyingAddress: vault.underlying.address[chainId] ?? '',
              underlyingDecimals: vault.underlying.decimals,
              apy7d: null,
              tvl: null,
              chains: vault.chains,
            };
          }
        }),
      );

      return {
        type: 'yo-vaults' as const,
        success: true,
        chainId,
        vaults: vaultData,
        message: `Found ${vaultData.length} YO vaults on chain ${chainId}`,
      };
    } catch (error) {
      return {
        type: 'yo-vaults' as const,
        success: false,
        chainId,
        vaults: [],
        message: 'Failed to fetch YO vaults',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

**Important**: The `@yo-protocol/core` API shape needs verification during implementation. The `getVaults()` method returns vault configs, and `getVaultSnapshot()` returns API data including APY and TVL. The exact field names (`apy7d`, `tvl`) must be checked against the actual SDK types in `node_modules/@yo-protocol/core/dist/`. If the field names differ, adjust accordingly.

**Verification during implementation**:
```bash
cd packages/mastra && node -e "
const { createYoClient } = require('@yo-protocol/core');
const c = createYoClient({ chainId: 8453 });
console.log(JSON.stringify(c.getVaults(), null, 2));
"
```

#### 2. Get Treasury Allocation Tool

**File**: `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts` (new)

Reuses `readVaultBalances` (now extended with ERC4626 support from Phase 1) to read the Fusion vault's current state.

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readVaultBalances } from '../alpha/read-vault-balances';

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
    type: z.literal('market-balances'),
    success: z.boolean(),
    assets: z.array(z.any()),
    markets: z.array(z.any()),
    totalValueUsd: z.string(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const snapshot = await readVaultBalances(publicClient, vaultAddress as Address);

      const tokenCount = snapshot.assets.length;
      const marketCount = snapshot.markets.length;
      const parts: string[] = [];
      if (tokenCount > 0) parts.push(`${tokenCount} token${tokenCount === 1 ? '' : 's'}`);
      if (marketCount > 0) parts.push(`${marketCount} YO vault allocation${marketCount === 1 ? '' : 's'}`);

      return {
        type: 'market-balances' as const,
        success: true,
        ...snapshot,
        message: parts.length > 0 ? `Treasury holds ${parts.join(' and ')}` : 'Treasury is empty',
      };
    } catch (error) {
      return {
        type: 'market-balances' as const,
        success: false,
        assets: [],
        markets: [],
        totalValueUsd: '0.00',
        message: 'Failed to read treasury allocation',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

This returns `type: 'market-balances'` so it reuses the existing `MarketBalancesList` React component in the frontend (Phase 3). No new renderer needed.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] `getYoVaultsTool` returns vault data for Base (chainId: 8453)
- [ ] `getTreasuryAllocationTool` reads balances for a test vault

#### Manual Verification:
- [ ] In Mastra Studio, agent responds to "What are my yield options?" with YO vault data
- [ ] Agent responds to "Show my allocation" with treasury breakdown

---

## Phase 4: Action Tools

### Overview

Build three action tools: allocate to YO vault, withdraw from YO vault, and swap tokens via Odos. Each creates encoded FuseAction data and auto-simulates on an Anvil fork (same pattern as alpha action tools).

### Changes Required:

#### 1. Create YO Allocation Action Tool

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts` (new)

Encodes `Erc4626SupplyFuse.enter({ vault, vaultAssetAmount })` and simulates.

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, encodeFunctionData } from 'viem';
import {
  yoErc4626SupplyFuseAbi,
  YO_VAULT_SLOTS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
} from '@wgenie/fusion-sdk';
import { simulateOnFork } from '../alpha/simulate-on-fork';

const existingActionSchema = z.object({
  id: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});

// Map YO vault ID to its supply fuse address getter
const SUPPLY_FUSE_BY_SLOT: Record<number, typeof ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS> = {
  1: ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  2: ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  3: ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  4: ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
};

export const createYoAllocationActionTool = createTool({
  id: 'create-yo-allocation-action',
  description: `Create a fuse action to allocate tokens from the treasury to a YO vault (yoUSD, yoETH, yoBTC, yoEUR).
Uses Erc4626SupplyFuse.enter() to deposit the underlying asset into the YO vault.
The treasury must hold the correct underlying token (e.g., USDC for yoUSD, WETH for yoETH).
Auto-simulates all pending actions on an Anvil fork.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID (8453 for Base)'),
    yoVaultId: z.enum(['yoUSD', 'yoETH', 'yoBTC', 'yoEUR']).describe('Which YO vault to allocate to'),
    yoVaultAddress: z.string().describe('YO vault contract address'),
    amount: z.string().describe('Amount in underlying token smallest unit (e.g., "50000000" for 50 USDC)'),
    callerAddress: z.string().optional().describe('Caller with ALPHA_ROLE for simulation'),
    existingPendingActions: z.array(existingActionSchema).optional(),
  }),
  outputSchema: z.object({
    type: z.literal('action-with-simulation'),
    success: z.boolean(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
    error: z.string().optional(),
    simulation: z.any().optional(),
  }),
  execute: async ({ vaultAddress, chainId, yoVaultId, yoVaultAddress, amount, callerAddress, existingPendingActions }) => {
    try {
      const slot = YO_VAULT_SLOTS[yoVaultId as keyof typeof YO_VAULT_SLOTS];
      if (!slot) throw new Error(`Unknown YO vault: ${yoVaultId}`);

      const supplyFuseAddresses = SUPPLY_FUSE_BY_SLOT[slot.slot];
      if (!supplyFuseAddresses) throw new Error(`No supply fuse for slot ${slot.slot}`);
      const fuseAddress = supplyFuseAddresses[chainId as keyof typeof supplyFuseAddresses];
      if (!fuseAddress) throw new Error(`Supply fuse not configured for chain ${chainId}`);

      const data = encodeFunctionData({
        abi: yoErc4626SupplyFuseAbi,
        functionName: 'enter',
        args: [{ vault: yoVaultAddress as Address, vaultAssetAmount: BigInt(amount) }],
      });

      const newFuseActions = [{ fuse: fuseAddress, data }];
      const description = `Allocate ${amount} to ${yoVaultId}`;

      let simulation;
      if (callerAddress) {
        const existingFuseActions = (existingPendingActions ?? []).flatMap(a => a.fuseActions);
        const allFuseActions = [...existingFuseActions, ...newFuseActions];
        const simResult = await simulateOnFork({
          vaultAddress,
          chainId,
          callerAddress,
          flatFuseActions: allFuseActions,
        });
        simulation = {
          ...simResult,
          actionsCount: (existingPendingActions?.length ?? 0) + 1,
        };
      }

      return {
        type: 'action-with-simulation' as const,
        success: true,
        protocol: 'yo-erc4626',
        actionType: 'supply',
        description,
        fuseActions: newFuseActions,
        simulation,
      };
    } catch (error) {
      return {
        type: 'action-with-simulation' as const,
        success: false,
        protocol: 'yo-erc4626',
        actionType: 'supply',
        description: `Failed: allocate to ${yoVaultId}`,
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 2. Create YO Withdraw Action Tool

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts` (new)

Uses `YoRedeemFuse.exit({ vault, shares })` — NOT `Erc4626SupplyFuse.exit()` (YoVault.withdraw() is disabled).

**Critical**: The YoRedeemFuse is not deployed to Base. For simulation purposes, the Anvil fork must deploy it dynamically. However, for the MVP, we can use a simpler approach: the tool creates the FuseAction assuming the fuse IS registered on the vault. If the vault was created with the web UI (Phase 3), the fuse will be deployed and registered. For testing in Mastra Studio, the simulation will fail unless a real vault with YoRedeemFuse exists.

**Alternative approach for MVP**: Since YoRedeemFuse isn't deployed yet, the withdraw tool can note this limitation and still generate correct calldata. The simulation will catch any issues.

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, encodeFunctionData, erc20Abi } from 'viem';
import { yoRedeemFuseAbi, YO_VAULT_SLOTS } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { simulateOnFork } from '../alpha/simulate-on-fork';

const existingActionSchema = z.object({
  id: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});

export const createYoWithdrawActionTool = createTool({
  id: 'create-yo-withdraw-action',
  description: `Create a fuse action to withdraw from a YO vault back to the treasury.
Uses YoRedeemFuse.exit() which calls redeem() — NOT withdraw() (withdraw is disabled on YO vaults).
Reads the vault's current YO share balance and redeems all or a specified amount.
Auto-simulates all pending actions on an Anvil fork.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID'),
    yoVaultId: z.enum(['yoUSD', 'yoETH', 'yoBTC', 'yoEUR']).describe('YO vault to withdraw from'),
    yoVaultAddress: z.string().describe('YO vault contract address'),
    yoRedeemFuseAddress: z.string().describe('Deployed YoRedeemFuse address for this market'),
    shares: z.string().optional().describe('Share amount to redeem. If omitted, redeems all shares.'),
    callerAddress: z.string().optional(),
    existingPendingActions: z.array(existingActionSchema).optional(),
  }),
  outputSchema: z.object({
    type: z.literal('action-with-simulation'),
    success: z.boolean(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
    error: z.string().optional(),
    simulation: z.any().optional(),
  }),
  execute: async ({ vaultAddress, chainId, yoVaultId, yoVaultAddress, yoRedeemFuseAddress, shares, callerAddress, existingPendingActions }) => {
    try {
      let sharesToRedeem: bigint;

      if (shares) {
        sharesToRedeem = BigInt(shares);
      } else {
        // Read all shares held by the vault
        const publicClient = getPublicClient(chainId);
        const balance = await publicClient.readContract({
          address: yoVaultAddress as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [vaultAddress as Address],
        });
        sharesToRedeem = balance;
      }

      if (sharesToRedeem === 0n) {
        return {
          type: 'action-with-simulation' as const,
          success: false,
          protocol: 'yo-erc4626',
          actionType: 'withdraw',
          description: `No ${yoVaultId} shares to withdraw`,
          fuseActions: [],
          error: `Treasury holds 0 ${yoVaultId} shares`,
        };
      }

      const data = encodeFunctionData({
        abi: yoRedeemFuseAbi,
        functionName: 'exit',
        args: [{ vault: yoVaultAddress as Address, shares: sharesToRedeem }],
      });

      const newFuseActions = [{ fuse: yoRedeemFuseAddress, data }];
      const description = `Withdraw ${sharesToRedeem} shares from ${yoVaultId}`;

      let simulation;
      if (callerAddress) {
        const existingFuseActions = (existingPendingActions ?? []).flatMap(a => a.fuseActions);
        const allFuseActions = [...existingFuseActions, ...newFuseActions];
        const simResult = await simulateOnFork({
          vaultAddress,
          chainId,
          callerAddress,
          flatFuseActions: allFuseActions,
        });
        simulation = {
          ...simResult,
          actionsCount: (existingPendingActions?.length ?? 0) + 1,
        };
      }

      return {
        type: 'action-with-simulation' as const,
        success: true,
        protocol: 'yo-erc4626',
        actionType: 'withdraw',
        description,
        fuseActions: newFuseActions,
        simulation,
      };
    } catch (error) {
      return {
        type: 'action-with-simulation' as const,
        success: false,
        protocol: 'yo-erc4626',
        actionType: 'withdraw',
        description: `Failed: withdraw from ${yoVaultId}`,
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 3. Create YO Swap Action Tool

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-swap-action.ts` (new)

Calls Odos API for a quote, then encodes `UniversalTokenSwapperFuse.enter()` with the Odos calldata.

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex, encodeFunctionData, erc20Abi } from 'viem';
import {
  yoUniversalTokenSwapperFuseAbi,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
} from '@wgenie/fusion-sdk';
import { simulateOnFork } from '../alpha/simulate-on-fork';

const existingActionSchema = z.object({
  id: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});

/** Call Odos quote + assemble APIs to get swap calldata */
async function getOdosSwapCalldata(params: {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageLimitPercent?: number;
  userAddr: string; // The SwapExecutor address (receives tokens mid-swap)
}): Promise<{
  routerAddress: string;
  swapCalldata: string;
  amountOut: string;
  gasEstimate: number;
}> {
  // Step 1: Quote
  const quoteResponse = await fetch('https://api.odos.xyz/sor/quote/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId: params.chainId,
      inputTokens: [{ tokenAddress: params.tokenIn, amount: params.amountIn }],
      outputTokens: [{ tokenAddress: params.tokenOut, proportion: 1 }],
      slippageLimitPercent: params.slippageLimitPercent ?? 0.5,
      userAddr: params.userAddr,
    }),
  });

  if (!quoteResponse.ok) {
    throw new Error(`Odos quote failed: ${quoteResponse.status} ${await quoteResponse.text()}`);
  }

  const quote = await quoteResponse.json();

  // Step 2: Assemble
  const assembleResponse = await fetch('https://api.odos.xyz/sor/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddr: params.userAddr,
      pathId: quote.pathId,
      simulate: false,
    }),
  });

  if (!assembleResponse.ok) {
    throw new Error(`Odos assemble failed: ${assembleResponse.status} ${await assembleResponse.text()}`);
  }

  const assembled = await assembleResponse.json();

  return {
    routerAddress: assembled.transaction.to,
    swapCalldata: assembled.transaction.data,
    amountOut: quote.outAmounts?.[0] ?? '0',
    gasEstimate: quote.gasEstimate ?? 0,
  };
}

export const createYoSwapActionTool = createTool({
  id: 'create-yo-swap-action',
  description: `Create a fuse action to swap tokens via the UniversalTokenSwapperFuse using Odos aggregator.
Use this when the user wants to swap assets (e.g., "Swap 500 USDC to WETH").
The swap executes through the Odos router via the vault's SwapExecutor.
Auto-simulates all pending actions on an Anvil fork.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID (8453 for Base)'),
    tokenIn: z.string().describe('Address of token to sell'),
    tokenOut: z.string().describe('Address of token to buy'),
    amountIn: z.string().describe('Amount to swap in smallest unit'),
    executorAddress: z.string().describe('SwapExecutor contract address'),
    callerAddress: z.string().optional(),
    existingPendingActions: z.array(existingActionSchema).optional(),
  }),
  outputSchema: z.object({
    type: z.literal('action-with-simulation'),
    success: z.boolean(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
    error: z.string().optional(),
    simulation: z.any().optional(),
  }),
  execute: async ({ vaultAddress, chainId, tokenIn, tokenOut, amountIn, executorAddress, callerAddress, existingPendingActions }) => {
    try {
      // Get Odos quote and swap calldata
      // The userAddr for Odos is the SwapExecutor — it receives tokens mid-swap
      const odos = await getOdosSwapCalldata({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        userAddr: executorAddress,
      });

      // Build UniversalTokenSwapperFuse.enter() calldata
      // The fuse transfers tokenIn to executor, executor calls the Odos router,
      // then executor sweeps both tokens back to the vault
      const targets: Address[] = [
        tokenIn as Address,   // approve Odos router
        odos.routerAddress as Address, // execute swap
      ];
      const swapData: Hex[] = [
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [odos.routerAddress as Address, BigInt(amountIn)],
        }),
        odos.swapCalldata as Hex,
      ];

      const fuseCalldata = encodeFunctionData({
        abi: yoUniversalTokenSwapperFuseAbi,
        functionName: 'enter',
        args: [{
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: BigInt(amountIn),
          data: { targets, data: swapData },
        }],
      });

      const swapFuseAddress = UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[chainId as keyof typeof UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS];
      if (!swapFuseAddress) throw new Error(`Swap fuse not configured for chain ${chainId}`);

      const newFuseActions = [{ fuse: swapFuseAddress, data: fuseCalldata }];
      const description = `Swap ${amountIn} ${tokenIn} → ${tokenOut} via Odos (expected out: ${odos.amountOut})`;

      let simulation;
      if (callerAddress) {
        const existingFuseActions = (existingPendingActions ?? []).flatMap(a => a.fuseActions);
        const allFuseActions = [...existingFuseActions, ...newFuseActions];
        const simResult = await simulateOnFork({
          vaultAddress,
          chainId,
          callerAddress,
          flatFuseActions: allFuseActions,
        });
        simulation = {
          ...simResult,
          actionsCount: (existingPendingActions?.length ?? 0) + 1,
        };
      }

      return {
        type: 'action-with-simulation' as const,
        success: true,
        protocol: 'yo-swap',
        actionType: 'swap',
        description,
        fuseActions: newFuseActions,
        simulation,
      };
    } catch (error) {
      return {
        type: 'action-with-simulation' as const,
        success: false,
        protocol: 'yo-swap',
        actionType: 'swap',
        description: 'Failed: swap via Odos',
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

**Odos API notes**:
- Free, no API key required
- Quote endpoint: `POST https://api.odos.xyz/sor/quote/v2`
- Assemble endpoint: `POST https://api.odos.xyz/sor/assemble`
- The `userAddr` in the Odos API should be the **SwapExecutor** address (`0x591435c065fce9713c8B112fcBf5Af98b8975cB3` on Base) — this is the contract that receives tokens mid-swap and sweeps them back to the vault
- Odos router on Base: `0x19cEeAd7105607Cd444F5ad10dd51356436095a1`
- The Odos calldata goes into the `data` array of `UniversalTokenSwapperEnterData`, with the Odos router as a `target`

#### 4. Barrel Export

**File**: `packages/mastra/src/tools/yo-treasury/index.ts` (new)

```typescript
export { getYoVaultsTool } from './get-yo-vaults';
export { getTreasuryAllocationTool } from './get-treasury-allocation';
export { createYoAllocationActionTool } from './create-yo-allocation-action';
export { createYoWithdrawActionTool } from './create-yo-withdraw-action';
export { createYoSwapActionTool } from './create-yo-swap-action';
export type { YoTreasuryToolOutput, YoVaultsOutput, YoActionWithSimulationOutput } from './types';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] `createYoAllocationActionTool` generates valid Erc4626SupplyFuse.enter calldata
- [ ] `createYoSwapActionTool` calls Odos API and returns valid UniversalTokenSwapperFuse.enter calldata
- [ ] Simulation runs on Anvil fork without errors (for a vault that has the correct fuses)

#### Manual Verification:
- [ ] In Mastra Studio, tools return correct output shapes

**Implementation Note**: The Odos API returns real market quotes — these change with time. Tests should validate the shape/structure, not exact values.

---

## Phase 5: Agent Definition & Registration

### Overview

Create the `yo-treasury-agent` with a system prompt tailored for YO Treasury management, working memory for pending actions, and all 7 tools (5 new + 2 reused from alpha).

### Changes Required:

#### 1. Agent Definition

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts` (new)

```typescript
import { Agent } from '@mastra/core/agent';
import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { z } from 'zod';
import { env } from '../env';
import {
  getYoVaultsTool,
  getTreasuryAllocationTool,
  createYoAllocationActionTool,
  createYoWithdrawActionTool,
  createYoSwapActionTool,
} from '../tools/yo-treasury';
import { displayPendingActionsTool, executePendingActionsTool } from '../tools/alpha';

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

export const yoTreasuryWorkingMemorySchema = z.object({
  pendingActions: z.array(pendingActionSchema).optional().describe(
    'List of pending fuse actions to execute as a batch'
  ),
});

const memory = new Memory({
  storage: new LibSQLStore({
    id: 'yo-treasury-agent-memory',
    url: 'file:./mastra.db',
  }),
  options: {
    workingMemory: {
      enabled: true,
      schema: yoTreasuryWorkingMemorySchema,
    },
  },
});

export const yoTreasuryAgent = new Agent({
  id: 'yo-treasury-agent',
  name: 'YO Treasury Agent',
  instructions: `You are a personal yield treasury copilot for YO Protocol. You help users manage their wGenie Fusion PlasmaVault that allocates across YO vaults (yoUSD, yoETH, yoBTC, yoEUR).

## TONE & STYLE

Communicate like a friendly savings advisor — clear, direct, no jargon:
- Use plain language: "your USDC", "earning 19% APY", "move funds to yoETH"
- When referencing amounts, use human-readable format: "50 USDC", "0.01 WETH"
- Keep responses to 1-2 sentences when tool output is displayed alongside
- Be enthusiastic about yield but honest about risks

## YOUR CAPABILITIES

### Read Information
- **getYoVaultsTool**: List available YO vaults with current APY, TVL, underlying asset
- **getTreasuryAllocationTool**: Read treasury's current holdings — unallocated tokens and YO vault positions

### Create Actions (Alpha Operations)
- **createYoAllocationActionTool**: Allocate tokens to a YO vault (e.g., "Put 50 USDC in yoUSD")
- **createYoWithdrawActionTool**: Withdraw from a YO vault back to treasury (e.g., "Pull funds from yoUSD")
- **createYoSwapActionTool**: Swap tokens via Odos aggregator (e.g., "Swap 100 USDC to WETH")

### Display & Execute
- **displayPendingActionsTool**: Show pending actions queue
- **executePendingActionsTool**: Send actions to UI for wallet signing

## WHAT YOU DO NOT DO

- You do NOT handle deposits INTO the treasury (that's a web UI form)
- You do NOT handle withdrawals FROM the treasury to the user's wallet (that's a web UI form)
- You only manage ALPHA actions: allocate to YO vaults, withdraw from YO vaults, swap assets

## WORKFLOW

1. The user's connected wallet (callerAddress) and their treasury vault address/chainId are in the system context. Use them automatically.
2. When asked about yields or options, call getYoVaultsTool
3. When asked about current holdings, call getTreasuryAllocationTool
4. When creating actions:
   a. Resolve token/vault addresses from tool results — NEVER guess
   b. Convert human amounts to smallest units (USDC=6 decimals, WETH=18, cbBTC=8, EURC=6)
   c. Call the appropriate action tool with callerAddress and existingPendingActions
   d. Store successful actions in working memory pendingActions
5. For compound operations like "Swap USDC to WETH and allocate to yoETH":
   a. Create swap action first
   b. Create allocation action second
   c. Both go into pendingActions — execute tool flattens them into one tx

## YO VAULT REFERENCE (Base, chainId: 8453)

| Vault | Address | Underlying | Slot |
|-------|---------|-----------|------|
| yoUSD | 0x0000000f2eb9f69274678c76222b35eec7588a65 | USDC (6 dec) | 1 |
| yoETH | 0x3a43aec53490cb9fa922847385d82fe25d0e9de7 | WETH (18 dec) | 2 |
| yoBTC | 0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc | cbBTC (8 dec) | 3 |
| yoEUR | 0x50c749ae210d3977adc824ae11f3c7fd10c871e9 | EURC (6 dec) | 4 |

## TOKEN ADDRESSES (Base)

| Token | Address | Decimals |
|-------|---------|----------|
| USDC | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | 6 |
| WETH | 0x4200000000000000000000000000000000000006 | 18 |
| cbBTC | 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf | 8 |
| EURC | 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42 | 6 |

## SWAP INFRASTRUCTURE (Base)

- SwapExecutor: 0x591435c065fce9713c8B112fcBf5Af98b8975cB3

## WORKING MEMORY

Your working memory has a pendingActions array. After each action tool call:
- Read current pendingActions
- Append new action with all fields (id, protocol, actionType, description, fuseActions)
- Generate incremental IDs ("1", "2", etc.)

## IMPORTANT RULES

- ALWAYS call tools — never fabricate data or describe tool output in text
- ALWAYS use getTreasuryAllocationTool to resolve balances before creating actions
- ALWAYS pass callerAddress and existingPendingActions to action tools
- When mentioning amounts in text, use human-readable format (e.g., "50 USDC")
- NEVER project future yields — only show current APYs from tool results`,
  model: env.MODEL,
  tools: {
    getYoVaultsTool,
    getTreasuryAllocationTool,
    createYoAllocationActionTool,
    createYoWithdrawActionTool,
    createYoSwapActionTool,
    displayPendingActionsTool,
    executePendingActionsTool,
  },
  memory,
});
```

**Note on `displayPendingActionsTool` and `executePendingActionsTool` reuse**: These tools from the alpha agent have hardcoded protocol enums (`'aave-v3' | 'morpho' | 'euler-v2'`). The yo-treasury agent uses `'yo-erc4626' | 'yo-swap'`. The tools' Zod schemas will need to be extended to accept the new protocol values, OR we create yo-specific versions. The simpler approach is to modify the existing tools' schemas to use `z.string()` instead of `z.enum([...])` for the protocol field, since these are pure pass-through renderers. Alternatively, create yo-specific wrappers.

**Decision**: Modify the existing tools to accept any protocol string (they're pass-throughs — the protocol value is for display only). This avoids duplicating the tools.

#### 2. Modify Pending Actions Tools for Protocol Flexibility

**File**: `packages/mastra/src/tools/alpha/display-pending-actions.ts` (modify)

Change the protocol field from `z.enum(['aave-v3', 'morpho', 'euler-v2'])` to `z.string()` in the input schema.

**File**: `packages/mastra/src/tools/alpha/execute-pending-actions.ts` (modify)

Same change: `z.enum(['aave-v3', 'morpho', 'euler-v2'])` → `z.string()`.

**File**: `packages/mastra/src/tools/alpha/types.ts` (modify)

Update `PendingActionsOutput.actions[].protocol` to `string` instead of the union literal.

#### 3. Register Agent

**File**: `packages/mastra/src/mastra/index.ts` (modify)

Add import and register:

```typescript
import { yoTreasuryAgent } from '../agents/yo-treasury-agent';

// In the Mastra constructor:
agents: { sqlAgent, plasmaVaultAgent, alphaAgent, yoTreasuryAgent },
```

#### 4. Export Agent

**File**: `packages/mastra/src/agents/index.ts` (modify)

Add export:

```typescript
export { yoTreasuryAgent } from './yo-treasury-agent';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] Agent loads in Mastra dev server: `cd packages/mastra && pnpm dev`
- [ ] Agent accessible at `http://localhost:4111` (agentId: `yo-treasury-agent`)

#### Manual Verification:
- [ ] "What are my yield options?" → calls getYoVaultsTool, returns YO vault data
- [ ] "Show my allocation" → calls getTreasuryAllocationTool, returns treasury state
- [ ] "Allocate 50 USDC to yoUSD" → creates FuseAction, simulates, shows before/after
- [ ] "Swap 10 USDC to WETH" → calls Odos, creates swap FuseAction, simulates
- [ ] "Execute" → calls executePendingActionsTool, returns flattened FuseActions for UI
- [ ] Agent does NOT try to handle deposit/withdraw from treasury
- [ ] Working memory persists pendingActions across turns

**Implementation Note**: After completing Phase 5 and all automated verification passes, pause for manual testing in Mastra Studio before proceeding to Phase 3 (Frontend).

---

## Testing Strategy

### Mastra Studio Testing (Primary)
- Start dev server: `cd packages/mastra && pnpm dev`
- Open `http://localhost:4111` → select `yo-treasury-agent`
- Test conversation flows manually

### Test Prompts
1. "What yields can I earn?" → should call getYoVaultsTool
2. "Show me my portfolio" → should call getTreasuryAllocationTool
3. "Put 50 USDC into yoUSD" → should call createYoAllocationActionTool
4. "Swap 100 USDC to WETH" → should call createYoSwapActionTool with Odos
5. "Withdraw everything from yoUSD" → should call createYoWithdrawActionTool
6. "Execute my actions" → should call executePendingActionsTool
7. "Deposit 100 USDC" → should politely decline (not its job)

### For simulation testing, a real vault with YO allocations is needed
Options:
a. Use an existing vault from `plasma-vaults.json` that has ERC4626 allocations (unlikely)
b. Deploy a test vault on Base using the SDK `createAndConfigureVault` (costs gas)
c. Test without simulation initially — the tools create correct calldata shapes regardless

### TypeScript Verification
```bash
cd packages/mastra && pnpm tsc --noEmit
```

## New Files Summary

```
packages/mastra/src/tools/yo-treasury/         # NEW tool directory
├── index.ts                                    # Barrel export
├── types.ts                                    # YoTreasuryToolOutput union
├── get-yo-vaults.ts                           # List YO vaults with APY/TVL
├── get-treasury-allocation.ts                  # Read treasury positions
├── create-yo-allocation-action.ts              # ERC4626SupplyFuse.enter
├── create-yo-withdraw-action.ts                # YoRedeemFuse.exit
└── create-yo-swap-action.ts                    # Odos + UniversalTokenSwapperFuse

packages/mastra/src/agents/
└── yo-treasury-agent.ts                        # NEW agent definition
```

## Modified Files Summary

```
packages/mastra/src/tools/alpha/read-vault-balances.ts  # ADD ERC4626 market handling
packages/mastra/src/tools/alpha/display-pending-actions.ts  # Relax protocol enum
packages/mastra/src/tools/alpha/execute-pending-actions.ts  # Relax protocol enum
packages/mastra/src/tools/alpha/types.ts                    # Relax protocol type
packages/mastra/src/agents/index.ts                         # ADD yoTreasuryAgent export
packages/mastra/src/mastra/index.ts                         # ADD yoTreasuryAgent to agents
```

## References

- Ticket: `thoughts/kuba/tickets/fsn_0048-execute-next-step-yo-hackathon.md`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
- Architecture: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Implementation phases: `thoughts/kuba/notes/yo-hackathon/project-plan/03-implementation-phases.md`
- Alpha agent: `packages/mastra/src/agents/alpha-agent.ts`
- Alpha tools: `packages/mastra/src/tools/alpha/`
- SDK yo module: `packages/sdk/src/markets/yo/`
- Fork test: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
- YoRedeemFuse plan: `thoughts/kuba/notes/yo-hackathon/plans/yo-redeem-fuse.md`
- Odos API docs: https://api.odos.xyz/sor/quote/v2 (POST), https://api.odos.xyz/sor/assemble (POST)
