# Alpha Agent: Anvil Fork Simulation with Before/After Balances

## Overview

Replace the existing `simulatePendingActionsTool` with an Anvil fork-based simulation that:
1. Spawns a local Anvil process forked from the live chain
2. Reads "before" balances using the existing SDK logic
3. Executes the transaction on the fork (impersonating the caller)
4. Reads "after" balances using the same SDK logic
5. Computes deltas and returns a comprehensive before/after comparison
6. Cleans up the Anvil process

This gives the agent (and user) full visibility into exactly how the vault's state changes after executing fuse actions.

## Current State Analysis

- `simulatePendingActionsTool` (`packages/mastra/src/tools/alpha/simulate-pending-actions.ts`) uses `publicClient.simulateContract()` (eth_call) — validates success/failure only, no state visibility
- `getMarketBalancesTool` (`packages/mastra/src/tools/alpha/get-market-balances.ts`) reads ERC20 + market positions via fusion SDK
- The fusion SDK's `PlasmaVault.create(publicClient, address)` accepts any viem PublicClient — confirmed by Hardhat fork tests (`packages/hardhat-tests/test/markets/aave-v3.ts:44`)
- Anvil 1.5.1 is available locally at `/Users/kuba/.foundry/bin/anvil`
- Test suite already demonstrates the pattern: impersonate account → setBalance → execute → read state (`packages/hardhat-tests/test/plasma-vault/alpha-execute.ts:53-111`)

### Key Discoveries:

- `PlasmaVault.create()` requires `publicClient.chain?.id` to be set (`packages/sdk/src/PlasmaVault.ts:64`)
- Market classes (AaveV3, Morpho, EulerV2) use `this.plasmaVault.publicClient` for all reads — swapping the client is all that's needed
- Test pattern uses `hardhat_impersonateAccount`; standalone Anvil uses `anvil_impersonateAccount` — viem's `createTestClient({ mode: 'anvil' })` handles this automatically
- Balance reading logic is currently embedded inside `getMarketBalancesTool.execute()` — needs extraction into a reusable function

## Desired End State

1. `simulatePendingActionsTool` spawns an Anvil fork, executes the transaction, and returns before/after/delta balances
2. A new `SimulationBalanceComparison` React component shows the before vs after comparison with delta highlighting
3. Agent instructions updated to describe the enhanced simulation output

### Verification:

- In Mastra Studio: Ask agent to simulate pending actions → agent returns simulation result with before/after balance comparison
- In web app: Same flow with the new comparison React component rendering correctly

## What We're NOT Doing

- Changing the balance-reading logic itself (we extract it, don't modify it)
- Adding Tenderly or other external simulation services
- Changing the `getMarketBalancesTool` output format (it stays the same)
- Changing the `executePendingActionsTool` or `ExecuteActions` component
- Adding Anvil as a npm dependency (it's a system binary)

## Implementation Approach

1. Extract balance-reading logic into a shared function
2. Replace `simulatePendingActionsTool` with Anvil fork-based version
3. Add `BalanceSnapshot` type and update `SimulationResultOutput`
4. Build new `SimulationBalanceComparison` React component
5. Update `AlphaToolRenderer` and agent instructions

---

## Phase 1: Extract Shared Balance Reading Function

### Overview

Extract the core balance-reading logic from `getMarketBalancesTool` into a reusable `readVaultBalances()` function that both tools can share.

### Changes Required:

#### 1. Create shared balance reading utility

**File**: `packages/mastra/src/tools/alpha/read-vault-balances.ts` (NEW)
**Changes**: Extract the entire try block from `getMarketBalancesTool.execute()` into a standalone async function.

```typescript
import { type Address, type PublicClient, erc20Abi, formatUnits } from 'viem';
import {
  PlasmaVault,
  MARKET_ID,
  substrateToAddress,
  AaveV3,
  Morpho,
  EulerV2,
  type MarketSubstrateBalance,
} from '@wgenie/fusion-sdk';
import type { MarketAllocation } from './types';

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

/** Balance snapshot for a vault — ERC20 tokens + market positions */
export interface BalanceSnapshot {
  assets: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
    priceUsd: string;
    valueUsd: string;
  }>;
  markets: MarketAllocation[];
  totalValueUsd: string;
}

/**
 * Read vault balances using the fusion SDK.
 * Extracted from getMarketBalancesTool so both the balances tool
 * and the simulation tool can reuse the same logic.
 *
 * @param publicClient - Any viem PublicClient (can point to live chain or Anvil fork)
 * @param vaultAddress - PlasmaVault contract address
 */
export async function readVaultBalances(
  publicClient: PublicClient,
  vaultAddress: Address,
): Promise<BalanceSnapshot> {
  // ... (entire balance-reading logic from get-market-balances.ts lines 111-340)
  // Creates PlasmaVault, reads ERC20 substrates, reads market balances
  // Returns { assets, markets, totalValueUsd }
}
```

The function body is a direct copy of `getMarketBalancesTool.execute()` lines 111-340, returning `{ assets, markets, totalValueUsd }` instead of the full tool output.

#### 2. Simplify getMarketBalancesTool

**File**: `packages/mastra/src/tools/alpha/get-market-balances.ts`
**Changes**: Replace the inline logic with a call to `readVaultBalances()`

```typescript
import { readVaultBalances } from './read-vault-balances';
// ... (keep existing imports for zod schemas)

export const getMarketBalancesTool = createTool({
  // ... (keep id, description, inputSchema, outputSchema unchanged)
  execute: async ({ vaultAddress, chainId }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const snapshot = await readVaultBalances(
        publicClient,
        vaultAddress as Address,
      );

      const tokenCount = snapshot.assets.length;
      const marketCount = snapshot.markets.length;
      const parts: string[] = [];
      if (tokenCount > 0) parts.push(`${tokenCount} token${tokenCount === 1 ? '' : 's'}`);
      if (marketCount > 0) parts.push(`${marketCount} market${marketCount === 1 ? '' : 's'}`);

      return {
        type: 'market-balances' as const,
        success: true,
        ...snapshot,
        message: parts.length > 0 ? `${parts.join(' and ')} found` : 'No positions found',
      };
    } catch (error) {
      return {
        type: 'market-balances' as const,
        success: false,
        assets: [],
        markets: [],
        totalValueUsd: '0.00',
        message: 'Failed to read market balances',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] `getMarketBalancesTool` returns identical output as before (no behavior change)

#### Manual Verification:

- [ ] In Mastra Studio, "check balances for vault X" still works and renders `MarketBalancesList`

**Implementation Note**: After completing this phase and all automated verification passes, proceed to Phase 2.

---

## Phase 2: Replace simulatePendingActionsTool with Anvil Fork

### Overview

Replace the eth_call-based simulation with an Anvil fork that actually executes the transaction, then reads before/after balances using the shared `readVaultBalances()` function.

### Changes Required:

#### 1. Create Anvil fork utility

**File**: `packages/mastra/src/tools/alpha/anvil-fork.ts` (NEW)
**Changes**: Utility to spawn/manage a temporary Anvil process

```typescript
import { spawn, type ChildProcess } from 'child_process';
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type TestClient,
  type WalletClient,
  type Address,
} from 'viem';
import { SUPPORTED_CHAINS } from '../plasma-vault/utils/viem-clients';
import { RPC_URLS } from '../../env';

/** Result of spawning an Anvil fork */
export interface AnvilFork {
  publicClient: PublicClient;
  testClient: TestClient;
  createWalletClient: (account: Address) => WalletClient;
  kill: () => void;
  port: number;
}

/** Find a random available port */
async function getRandomPort(): Promise<number> {
  const { createServer } = await import('net');
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port'));
      }
    });
  });
}

/** Wait for Anvil to be ready by polling the RPC endpoint */
async function waitForReady(port: number, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 }),
      });
      if (res.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Anvil did not start within ${timeoutMs}ms`);
}

/**
 * Spawn an Anvil fork of the given chain.
 * Returns clients and a kill function for cleanup.
 */
export async function spawnAnvilFork(chainId: number): Promise<AnvilFork> {
  const chain = SUPPORTED_CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);

  const rpcUrl = RPC_URLS[chainId];
  if (!rpcUrl) throw new Error(`No RPC URL for chain ${chainId}`);

  const port = await getRandomPort();

  const anvil: ChildProcess = spawn('anvil', [
    '--fork-url', rpcUrl,
    '--port', String(port),
    '--silent',
    '--no-rate-limit',
    '--steps-tracing',  // needed for accurate gas estimation
  ], { stdio: 'ignore' });

  // Ensure cleanup on unexpected exit
  const cleanup = () => {
    try { anvil.kill('SIGTERM'); } catch {}
  };

  try {
    await waitForReady(port);
  } catch (err) {
    cleanup();
    throw err;
  }

  const transport = http(`http://127.0.0.1:${port}`);

  return {
    publicClient: createPublicClient({ chain, transport }),
    testClient: createTestClient({ chain, transport, mode: 'anvil' }),
    createWalletClient: (account: Address) =>
      createWalletClient({ chain, account, transport }),
    kill: cleanup,
    port,
  };
}
```

#### 2. Replace simulatePendingActionsTool

**File**: `packages/mastra/src/tools/alpha/simulate-pending-actions.ts`
**Changes**: Complete rewrite to use Anvil fork + before/after balance reading

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex, parseEther } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readVaultBalances, type BalanceSnapshot } from './read-vault-balances';
import { spawnAnvilFork } from './anvil-fork';

/** Minimal ABI for PlasmaVault.execute(FuseAction[]) */
const plasmaVaultExecuteAbi = [
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {
        name: 'calls_',
        type: 'tuple[]',
        internalType: 'struct FuseAction[]',
        components: [
          { name: 'fuse', type: 'address', internalType: 'address' },
          { name: 'data', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Zod schemas for balance snapshot (for outputSchema)
const balanceAssetSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  balance: z.string(),
  balanceFormatted: z.string(),
  priceUsd: z.string(),
  valueUsd: z.string(),
});

const balanceMarketPositionSchema = z.object({
  underlyingToken: z.string(),
  underlyingSymbol: z.string(),
  supplyFormatted: z.string(),
  supplyValueUsd: z.string(),
  borrowFormatted: z.string(),
  borrowValueUsd: z.string(),
  totalValueUsd: z.string(),
});

const balanceMarketSchema = z.object({
  marketId: z.string(),
  protocol: z.string(),
  positions: z.array(balanceMarketPositionSchema),
  totalValueUsd: z.string(),
});

const balanceSnapshotSchema = z.object({
  assets: z.array(balanceAssetSchema),
  markets: z.array(balanceMarketSchema),
  totalValueUsd: z.string(),
});

export const simulatePendingActionsTool = createTool({
  id: 'simulate-pending-actions',
  description: `Simulate executing pending fuse actions on a PlasmaVault using an Anvil fork.
Forks the live chain state, executes the transaction, and reads balances before and after.
Returns a comprehensive before/after comparison with deltas for every token and market position.
Requires the caller address (must have ALPHA_ROLE on the vault).
Call this when the user asks to simulate, test, or validate their pending actions.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('PlasmaVault contract address'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    callerAddress: z.string().describe('Address that will call execute (must have ALPHA_ROLE)'),
    actions: z.array(z.object({
      id: z.string(),
      protocol: z.enum(['aave-v3', 'morpho', 'euler-v2']),
      actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
      description: z.string(),
      fuseActions: z.array(z.object({
        fuse: z.string(),
        data: z.string(),
      })),
    })).describe('The pending actions from working memory to simulate'),
  }),
  outputSchema: z.object({
    type: z.literal('simulation-result'),
    success: z.boolean(),
    message: z.string(),
    vaultAddress: z.string(),
    chainId: z.number(),
    callerAddress: z.string(),
    actionsCount: z.number(),
    fuseActionsCount: z.number(),
    error: z.string().optional(),
    flatFuseActions: z.array(z.object({
      fuse: z.string(),
      data: z.string(),
    })),
    balancesBefore: balanceSnapshotSchema.optional(),
    balancesAfter: balanceSnapshotSchema.optional(),
  }),
  execute: async ({ vaultAddress, chainId, callerAddress, actions }) => {
    const flatFuseActions = actions.flatMap(a => a.fuseActions);

    if (flatFuseActions.length === 0) {
      return {
        type: 'simulation-result' as const,
        success: false,
        message: 'No fuse actions to simulate',
        vaultAddress,
        chainId,
        callerAddress,
        actionsCount: 0,
        fuseActionsCount: 0,
        flatFuseActions: [],
      };
    }

    let fork: Awaited<ReturnType<typeof spawnAnvilFork>> | null = null;

    try {
      // 1. Spawn Anvil fork
      fork = await spawnAnvilFork(chainId);

      // 2. Read "before" balances on the fork (identical to live state)
      const balancesBefore = await readVaultBalances(
        fork.publicClient,
        vaultAddress as Address,
      );

      // 3. Impersonate caller and fund gas
      await fork.testClient.impersonateAccount({ address: callerAddress as Address });
      await fork.testClient.setBalance({
        address: callerAddress as Address,
        value: parseEther('10'),
      });

      // 4. Execute the transaction on the fork
      const walletClient = fork.createWalletClient(callerAddress as Address);
      const hash = await walletClient.writeContract({
        address: vaultAddress as Address,
        abi: plasmaVaultExecuteAbi,
        functionName: 'execute',
        args: [flatFuseActions.map(a => ({
          fuse: a.fuse as Address,
          data: a.data as Hex,
        }))],
      });

      // Wait for the tx to be mined on the fork
      await fork.publicClient.waitForTransactionReceipt({ hash });

      // 5. Read "after" balances on the fork (post-execution state)
      const balancesAfter = await readVaultBalances(
        fork.publicClient,
        vaultAddress as Address,
      );

      return {
        type: 'simulation-result' as const,
        success: true,
        message: `Simulation successful! ${flatFuseActions.length} fuse action${flatFuseActions.length === 1 ? '' : 's'} from ${actions.length} pending action${actions.length === 1 ? '' : 's'} executed on fork.`,
        vaultAddress,
        chainId,
        callerAddress,
        actionsCount: actions.length,
        fuseActionsCount: flatFuseActions.length,
        flatFuseActions,
        balancesBefore,
        balancesAfter,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Fallback: if Anvil fork failed entirely, try simple eth_call simulation
      let simpleSimSuccess = false;
      try {
        const publicClient = getPublicClient(chainId);
        await publicClient.simulateContract({
          account: callerAddress as Address,
          address: vaultAddress as Address,
          abi: plasmaVaultExecuteAbi,
          functionName: 'execute',
          args: [flatFuseActions.map(a => ({
            fuse: a.fuse as Address,
            data: a.data as Hex,
          }))],
        });
        simpleSimSuccess = true;
      } catch {
        // Both fork and simple sim failed
      }

      return {
        type: 'simulation-result' as const,
        success: false,
        message: simpleSimSuccess
          ? `Fork simulation failed (${errorMessage}), but eth_call simulation succeeded. Transaction would likely succeed on-chain.`
          : `Simulation failed: ${errorMessage}`,
        vaultAddress,
        chainId,
        callerAddress,
        actionsCount: actions.length,
        fuseActionsCount: flatFuseActions.length,
        error: errorMessage,
        flatFuseActions,
      };
    } finally {
      // 6. Always clean up the Anvil process
      fork?.kill();
    }
  },
});
```

#### 3. Update types

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Add `BalanceSnapshot` to `SimulationResultOutput`, add export

```typescript
// Add BalanceSnapshot type (matches the interface in read-vault-balances.ts)
export interface BalanceSnapshot {
  assets: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
    priceUsd: string;
    valueUsd: string;
  }>;
  markets: MarketAllocation[];
  totalValueUsd: string;
}

// Update SimulationResultOutput to include before/after balances
export type SimulationResultOutput = {
  type: 'simulation-result';
  success: boolean;
  message: string;
  vaultAddress: string;
  chainId: number;
  callerAddress: string;
  actionsCount: number;
  fuseActionsCount: number;
  error?: string;
  flatFuseActions: Array<{
    fuse: string;
    data: string;
  }>;
  balancesBefore?: BalanceSnapshot;
  balancesAfter?: BalanceSnapshot;
};
```

#### 4. Update index exports

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Add export for `BalanceSnapshot` type

```typescript
export type { ..., BalanceSnapshot } from './types';
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] Anvil can fork mainnet: `anvil --fork-url $ETHEREUM_RPC_URL --port 0 --silent &` then kill

#### Manual Verification:

- [ ] In Mastra Studio: simulate pending actions → tool returns `balancesBefore` and `balancesAfter` in the output
- [ ] Simulation of a supply action shows token balance decrease in `balancesAfter.assets` and market supply increase in `balancesAfter.markets`
- [ ] Simulation of a failing action (e.g., borrowing without collateral) returns `success: false` with error
- [ ] Anvil process is properly killed after simulation (no orphan processes)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 3.

---

## Phase 3: New React Component for Balance Comparison

### Overview

Create a `SimulationBalanceComparison` React component that renders the before/after/delta balance comparison. Update `SimulationResult` to show this when balances are present.

### Changes Required:

#### 1. Create SimulationBalanceComparison component

**File**: `packages/web/src/vault-details/components/simulation-balance-comparison.tsx` (NEW)
**Changes**: New component for before/after balance table

The component should:
- Accept `balancesBefore` and `balancesAfter` as props (both `BalanceSnapshot`)
- Compute deltas for each token/position
- Show a table with columns: Asset | Before | After | Change
- Color-code changes: green for positive (value gained), red for negative (value lost)
- Separate sections for "Unallocated Tokens" and each market (Aave V3, Morpho, Euler V2)
- Show total portfolio value before/after/delta at the top

Key UI elements:
- Total value summary: `$12,345.67 → $11,845.67 (-$500.00)` with color
- Unallocated tokens rows: symbol | before balance | after balance | delta
- Market position rows: symbol | before supply/borrow | after supply/borrow | delta
- Use existing `formatBalance` and `formatUsd` helper functions (copy from `market-balances-list.tsx` or extract to shared util)

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BalanceSnapshot } from '@wgenie/fusion-mastra/alpha-types';

interface Props {
  before: BalanceSnapshot;
  after: BalanceSnapshot;
}

export function SimulationBalanceComparison({ before, after }: Props) {
  const totalBefore = parseFloat(before.totalValueUsd);
  const totalAfter = parseFloat(after.totalValueUsd);
  const totalDelta = totalAfter - totalBefore;

  return (
    <Card className="p-4 space-y-4">
      {/* Total value header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Portfolio Value</span>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{formatUsd(before.totalValueUsd)}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-semibold">{formatUsd(after.totalValueUsd)}</span>
          <DeltaBadge value={totalDelta} />
        </div>
      </div>

      {/* Unallocated Tokens section */}
      {/* ... render before/after for each token */}

      {/* Market Positions sections */}
      {/* ... render before/after for each market + position */}
    </Card>
  );
}

function DeltaBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.01) return <span className="text-xs text-muted-foreground">—</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? '+' : ''}{formatUsd(value.toFixed(2))}
    </span>
  );
}
```

#### 2. Update SimulationResult component

**File**: `packages/web/src/vault-details/components/simulation-result.tsx`
**Changes**: Add balance comparison rendering when `balancesBefore` and `balancesAfter` are present

Add imports and conditionally render `SimulationBalanceComparison`:

```tsx
import { SimulationBalanceComparison } from './simulation-balance-comparison';
import type { BalanceSnapshot } from '@wgenie/fusion-mastra/alpha-types';

interface Props {
  // ... existing props ...
  balancesBefore?: BalanceSnapshot;
  balancesAfter?: BalanceSnapshot;
}

export function SimulationResult({ ..., balancesBefore, balancesAfter }: Props) {
  // ... existing JSX ...

  return (
    <Card ...>
      {/* Status header (existing) */}
      {/* Error details (existing) */}
      {/* Action summary (existing) */}

      {/* NEW: Balance comparison */}
      {success && balancesBefore && balancesAfter && (
        <SimulationBalanceComparison
          before={balancesBefore}
          after={balancesAfter}
        />
      )}

      {/* Execute section (existing) */}
      {/* Tx hash & confirmation (existing) */}
    </Card>
  );
}
```

#### 3. Update AlphaToolRenderer

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
**Changes**: Pass new balance props to `SimulationResult`

```tsx
case 'simulation-result':
  return (
    <SimulationResult
      success={typed.success}
      message={typed.message}
      vaultAddress={typed.vaultAddress}
      chainId={typed.chainId}
      error={typed.error}
      flatFuseActions={typed.flatFuseActions}
      actionsCount={typed.actionsCount}
      fuseActionsCount={typed.fuseActionsCount}
      balancesBefore={typed.balancesBefore}
      balancesAfter={typed.balancesAfter}
    />
  );
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Next.js dev server starts: `cd packages/web && pnpm dev`

#### Manual Verification:

- [ ] In web app: simulate pending supply → balance comparison shows token decrease + market supply increase
- [ ] In web app: simulate pending borrow → balance comparison shows market borrow increase
- [ ] Delta colors: green for gains, red for losses
- [ ] No change rows show neutral/dash indicator
- [ ] Execute button still works after simulation succeeds
- [ ] Fallback: when simulation fails (no balances), component renders as before (just error message)

**Implementation Note**: After completing this phase and all verification passes, proceed to Phase 4.

---

## Phase 4: Update Agent Instructions

### Overview

Update the Alpha Agent's system instructions to describe the enhanced simulation output with before/after balances.

### Changes Required:

#### 1. Update agent instructions

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Replace the `## SIMULATION ONLY` section

Replace the existing `## SIMULATION ONLY` section with:

```
## SIMULATION

When the user asks to simulate (without executing), use simulatePendingActionsTool:

1. Ask for their wallet address (the caller) if not already provided. This address must have ALPHA_ROLE on the vault.
2. Call simulatePendingActionsTool with:
   - vaultAddress and chainId from the conversation context
   - callerAddress from the user
   - actions from your working memory's pendingActions
3. The simulation forks the live chain, executes the transaction on the fork, and reads balances before and after.
4. The result includes:
   - Whether the transaction succeeded or failed
   - **balancesBefore**: Vault's full state BEFORE the transaction (ERC20 tokens + market positions)
   - **balancesAfter**: Vault's full state AFTER the transaction
   - The UI renders a before/after comparison with deltas highlighted
5. Use balancesBefore and balancesAfter to explain to the user what changed:
   - Which token balances increased/decreased
   - How market positions (supply/borrow) shifted
   - Net portfolio value change
6. If the simulation failed, explain the error and suggest fixes (e.g., insufficient collateral for borrowing).
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`

#### Manual Verification:

- [ ] In Mastra Studio: agent explains balance changes after simulation (e.g., "After this supply, your USDC balance decreased by 1000 and your Aave V3 supply position increased by 1000")

**Implementation Note**: After completing this phase, the feature is complete.

---

## Testing Strategy

### Unit Tests:

- None added — the core logic (SDK balance reading, Anvil forking) is well-tested in `packages/hardhat-tests/`

### Integration Tests:

- None added — manual testing via Mastra Studio and web app is sufficient for this feature

### Manual Testing Steps:

1. **Studio: Supply simulation**
   - Create supply action → simulate → verify before/after shows token decrease + market supply increase
2. **Studio: Borrow simulation**
   - Create borrow action → simulate → verify before/after shows market borrow increase
3. **Studio: Multi-action simulation**
   - Supply + borrow → simulate → verify all deltas in one view
4. **Studio: Failing simulation**
   - Create action that will revert (e.g., withdraw more than available) → simulate → verify error message
5. **Web app: Full flow**
   - Check balances → create actions → simulate → verify comparison component renders → execute

## Performance Considerations

- Anvil fork startup takes ~2-5 seconds (one-time per simulation)
- Balance reading takes ~1-3 seconds per snapshot (2 snapshots = before + after)
- Total simulation time: ~5-10 seconds (acceptable for a simulation operation)
- Anvil process is killed immediately after use — no lingering resource consumption
- Random port allocation prevents conflicts with other services

## References

- Agent definition: `packages/mastra/src/agents/alpha-agent.ts`
- Current simulation tool: `packages/mastra/src/tools/alpha/simulate-pending-actions.ts`
- Balance reading tool: `packages/mastra/src/tools/alpha/get-market-balances.ts`
- Types: `packages/mastra/src/tools/alpha/types.ts`
- Viem clients: `packages/mastra/src/tools/plasma-vault/utils/viem-clients.ts`
- React renderer: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
- SimulationResult component: `packages/web/src/vault-details/components/simulation-result.tsx`
- MarketBalancesList component: `packages/web/src/vault-details/components/market-balances-list.tsx`
- Hardhat fork tests (reference patterns): `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts`
- SDK PlasmaVault: `packages/sdk/src/PlasmaVault.ts`
- SDK market classes: `packages/sdk/src/markets/aave-v3/AaveV3.ts`, `packages/sdk/src/markets/morpho/Morpho.ts`, `packages/sdk/src/markets/euler-v2/EulerV2.ts`
