# FSN-0080: Consolidate Alpha Tool Outputs into Unified Transaction Proposal

## Overview

Merge the four Alpha tool output types (`market-balances`, `action-with-simulation`, `pending-actions`, `execute-actions`) into a single `transaction-proposal` type. Each action creation produces a unified card showing: all pending actions + simulation result + execute button (when ready). Applies to both Alpha and YO Treasury agents.

## Current State Analysis

### Backend — 4 output types in `packages/mastra/src/tools/alpha/types.ts`
- `MarketBalancesOutput` — vault holdings, rendered as `MarketBalancesList`
- `ActionWithSimulationOutput` — single action + fork simulation, rendered as `ActionWithSimulation`
- `PendingActionsOutput` — action queue list, rendered as `PendingActionsList`
- `ExecuteActionsOutput` — flattened fuse actions for wallet signing, rendered as `ExecuteActions`

### Frontend — 4 components in `packages/web/src/alpha/tools/`
- `market-balances/market-balances-list.tsx` — token balances + market positions card
- `action-with-simulation/action-with-simulation.tsx` + `simulation-balance-comparison.tsx` — action result + before/after diff
- `pending-actions/pending-actions-list.tsx` — expandable queue list
- `execute-actions/execute-actions.tsx` — 5-step wallet wizard (connect → chain → role → simulate → execute)

### Agent flow (current)
1. User asks about balances → agent calls `getMarketBalancesTool` → renders `MarketBalancesList`
2. User asks to create action → agent calls action tool → renders `ActionWithSimulation`
3. User asks to see queue → agent calls `displayPendingActionsTool` → renders `PendingActionsList`
4. User asks to execute → agent calls `executePendingActionsTool` → renders `ExecuteActions`

**Problem**: 3-4 separate tool calls requiring user prompts between each. Data scattered across separate cards.

### Key Discoveries
- All 6 action creation tools (3 alpha, 3 yo-treasury) follow identical pattern: encode calldata → merge with existing → `simulateOnFork` → return `ActionWithSimulationOutput` (`types.ts:101-121`)
- `displayPendingActionsTool` and `executePendingActionsTool` are pure pass-throughs (`display-pending-actions.ts:36-43`, `execute-pending-actions.ts:33-48`)
- `existingActionSchema` in yo-treasury only has `{id, fuseActions}` (`yo-treasury/types.ts:4-7`); alpha tools define their own identical inline schema
- `[UI rendered…]` sentinel messages leak into chat (`get-yo-vaults.ts:68`, `get-treasury-allocation.ts:47`)
- Descriptions use raw units: `"Allocate 50000000 to yoUSD"` (`create-yo-allocation-action.ts:64`), `"Swap 50000000 0x833... → 0x420..."` (`create-yo-swap-action.ts:131`)
- `SimulationBalanceComparison` renders its own `<Card>` wrapper (`simulation-balance-comparison.tsx:224-276`) — will nest badly inside a parent card
- Alpha tools define `existingActionSchema` inline 3 times (`create-aave-v3-action.ts:8-11`, `create-morpho-action.ts:8-11`, `create-euler-v2-action.ts:8-11`)

## Desired End State

### Agent flow (new)
1. User asks to create action(s) → agent calls action tool(s) → each returns `TransactionProposalOutput`
   - Shows ALL pending actions (existing + new) in a unified card
   - Shows simulation diff (runs every time the queue changes)
   - If `isReady: false` (more actions coming): shows "Preparing more actions..." indicator, no execute section
   - If `isReady: true` (final action): shows execute wizard with connect → role check → execute
2. Single-action flow: 1 tool call with `isReady: true` → user sees action + simulation + execute in one card
3. Multi-action flow: N tool calls, first N-1 with `isReady: false`, last with `isReady: true`
4. Balance checking uses a lightweight tool that returns data for agent reasoning but renders no UI

### Verification
- Storybook story at `http://localhost:6007/iframe.html?globals=theme%3Adark&args=&id=yo-treasury-chat--default&viewMode=story` shows:
  - Single action: one card with action list (1 item) + simulation + execute wizard
  - Multi-action: intermediate cards with growing action list + simulation + "preparing" indicator, final card has execute
  - No `[UI rendered…]` messages visible in chat
  - Token amounts in human-readable format ("50 USDC" not "50000000")
- Alpha agent chat behaves identically
- No TypeScript errors: `pnpm --filter @wgenie/fusion-web typecheck && pnpm --filter @wgenie/fusion-mastra tsc --noEmit`

## What We're NOT Doing

- Not changing action creation core logic (calldata encoding, fuse address resolution, Odos integration)
- Not changing simulation infrastructure (`simulateOnFork`, `spawnAnvilFork`, `readVaultBalances`)
- Not changing working memory architecture (`createWorkingMemorySchema`, `createPendingActionSchema`)
- Not changing the API routes (`/api/yo/treasury/chat`, alpha vault chat route)
- Not changing `AgentChat` component or `useChat` transport layer
- Not splitting transactions into multiple executions (all actions batched in one `PlasmaVault.execute()`)

## Implementation Approach

Each action creation tool becomes self-contained: it encodes calldata, assembles the full pending queue (existing + new), runs fork simulation, and returns a `TransactionProposalOutput`. A shared `buildTransactionProposal()` helper extracts the common simulation + output assembly logic. A single `TransactionProposal` React component replaces all four existing components.

---

## Phase 1: Backend — New Types & Shared Helper

### Overview
Define the new `TransactionProposalOutput` type, expand `existingActionSchema` to carry full action metadata, and create `buildTransactionProposal()` helper.

### Changes Required:

#### 1. New type definitions

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Add `TransactionProposalOutput`, add `BalanceCheckOutput`, update `AlphaToolOutput` union. Keep `BalanceSnapshot`, `MarketAllocation`, `MarketPosition` (still used by simulation). Remove `PendingActionsOutput`, `MarketBalancesOutput`, `ExecuteActionsOutput`, `ActionWithSimulationOutput` (will break downstream temporarily — fixed in later phases).

```ts
/** Unified transaction proposal — replaces action-with-simulation, pending-actions, execute-actions */
export type TransactionProposalOutput = {
  type: 'transaction-proposal';
  /** 'partial' = more actions expected (no execute), 'ready' = final (show execute) */
  status: 'partial' | 'ready';
  /** All pending actions (existing + newly created) */
  actions: Array<{
    id: string;
    protocol: string;
    actionType: string;
    description: string;
    fuseActions: Array<{ fuse: string; data: string }>;
  }>;
  /** The newly created action result */
  newAction: {
    success: boolean;
    protocol: string;
    actionType: string;
    description: string;
    error?: string;
  };
  /** Fork simulation of the full batch (always runs when callerAddress available) */
  simulation?: {
    success: boolean;
    message: string;
    actionsCount: number;
    fuseActionsCount: number;
    balancesBefore?: BalanceSnapshot;
    balancesAfter?: BalanceSnapshot;
    error?: string;
  };
  /** Execute data — always included, UI uses status to show/hide execute section */
  vaultAddress: string;
  chainId: number;
  flatFuseActions: Array<{ fuse: string; data: string }>;
  actionsCount: number;
  fuseActionsCount: number;
  actionsSummary: string;
};

/** Lightweight balance data for agent reasoning — not rendered in UI */
export type BalanceCheckOutput = {
  type: 'balance-check';
  success: boolean;
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
  error?: string;
};

/** Union of all alpha tool output types */
export type AlphaToolOutput =
  | TransactionProposalOutput
  | BalanceCheckOutput;
```

#### 2. Expand existing action schema

**File**: `packages/mastra/src/tools/yo-treasury/types.ts`
**Changes**: Add `protocol`, `actionType`, `description` to `existingActionSchema` so action tools receive full metadata for the proposal output.

```ts
import { z } from 'zod';

/** Full pending action schema — passed from working memory to action tools */
export const existingActionSchema = z.object({
  id: z.string(),
  protocol: z.string(),
  actionType: z.string(),
  description: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});
```

#### 3. Shared helper: `buildTransactionProposal()`

**File**: `packages/mastra/src/tools/alpha/build-transaction-proposal.ts` (new file)
**Changes**: Create helper that all 6 action tools call after encoding their calldata.

```ts
import { simulateOnFork } from './simulate-on-fork';

interface PendingAction {
  id: string;
  protocol: string;
  actionType: string;
  description: string;
  fuseActions: Array<{ fuse: string; data: string }>;
}

interface NewAction {
  success: boolean;
  protocol: string;
  actionType: string;
  description: string;
  fuseActions: Array<{ fuse: string; data: string }>;
  error?: string;
}

interface BuildProposalParams {
  newAction: NewAction;
  existingPendingActions?: PendingAction[];
  vaultAddress: string;
  chainId: number;
  callerAddress?: string;
  isReady: boolean;
}

export async function buildTransactionProposal({
  newAction,
  existingPendingActions = [],
  vaultAddress,
  chainId,
  callerAddress,
  isReady,
}: BuildProposalParams): Promise<TransactionProposalOutput> {
  // If new action failed, return with error — don't add to queue or simulate
  if (!newAction.success) {
    const flatFuseActions = existingPendingActions.flatMap(a => a.fuseActions);
    return {
      type: 'transaction-proposal' as const,
      status: 'partial',
      actions: existingPendingActions,
      newAction: {
        success: false,
        protocol: newAction.protocol,
        actionType: newAction.actionType,
        description: newAction.description,
        error: newAction.error,
      },
      vaultAddress,
      chainId,
      flatFuseActions,
      actionsCount: existingPendingActions.length,
      fuseActionsCount: flatFuseActions.length,
      actionsSummary: existingPendingActions
        .map(a => `${a.actionType} on ${a.protocol}: ${a.description}`)
        .join('\n'),
    };
  }

  // Build complete action list
  const newEntry: PendingAction = {
    id: String(existingPendingActions.length + 1),
    protocol: newAction.protocol,
    actionType: newAction.actionType,
    description: newAction.description,
    fuseActions: newAction.fuseActions,
  };
  const allActions = [...existingPendingActions, newEntry];
  const flatFuseActions = allActions.flatMap(a => a.fuseActions);

  // Always simulate when callerAddress is available
  let simulation;
  if (callerAddress) {
    const simResult = await simulateOnFork({
      vaultAddress,
      chainId,
      callerAddress,
      flatFuseActions,
    });
    simulation = {
      ...simResult,
      actionsCount: allActions.length,
    };
  }

  return {
    type: 'transaction-proposal' as const,
    status: isReady ? 'ready' : 'partial',
    actions: allActions,
    newAction: {
      success: true,
      protocol: newAction.protocol,
      actionType: newAction.actionType,
      description: newAction.description,
    },
    simulation,
    vaultAddress,
    chainId,
    flatFuseActions,
    actionsCount: allActions.length,
    fuseActionsCount: flatFuseActions.length,
    actionsSummary: allActions
      .map(a => `${a.actionType} on ${a.protocol}: ${a.description}`)
      .join('\n'),
  };
}
```

#### 4. Update alpha index exports

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Remove `displayPendingActionsTool`, `executePendingActionsTool`, `getMarketBalancesTool` exports. Add `readVaultBalancesTool`, `buildTransactionProposal`. Remove old type exports, add new ones.

```ts
export { createAaveV3ActionTool } from './create-aave-v3-action';
export { createMorphoActionTool } from './create-morpho-action';
export { createEulerV2ActionTool } from './create-euler-v2-action';
export { readVaultBalancesTool } from './read-vault-balances-tool';
export { buildTransactionProposal } from './build-transaction-proposal';
export type { AlphaToolOutput, TransactionProposalOutput, BalanceCheckOutput, BalanceSnapshot } from './types';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles for mastra package: `pnpm --filter @wgenie/fusion-mastra tsc --noEmit` (will fail until Phase 2-3 update consumers)

#### Manual Verification:
- [ ] Types are well-defined and cover all use cases

**Implementation Note**: This phase creates foundation types. Downstream consumers (tools, components) will temporarily break until Phases 2-3.

---

## Phase 2: Backend — Balance Reading Tools

### Overview
Replace `getMarketBalancesTool`, `getYoVaultsTool`, and `getTreasuryAllocationTool` with lightweight balance-reading tools that return data for agent reasoning without rendering UI.

### Changes Required:

#### 1. Alpha balance tool

**File**: `packages/mastra/src/tools/alpha/read-vault-balances-tool.ts` (new file)
**Changes**: Lightweight wrapper around existing `readVaultBalances()`. Returns `type: 'balance-check'` (not rendered by UI).

```ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readVaultBalances } from './read-vault-balances';

export const readVaultBalancesTool = createTool({
  id: 'read-vault-balances',
  description: `Read the vault's unallocated ERC20 tokens and allocated DeFi market positions.
Returns token names, symbols, balances, USD prices, and per-market supply/borrow positions.
Use this to check what tokens are available before creating actions.
This tool does NOT render UI — it returns raw data for your reasoning.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
  }),
  outputSchema: z.object({
    type: z.literal('balance-check'),
    success: z.boolean(),
    assets: z.array(z.object({
      address: z.string(),
      name: z.string(),
      symbol: z.string(),
      decimals: z.number(),
      balance: z.string(),
      balanceFormatted: z.string(),
      priceUsd: z.string(),
      valueUsd: z.string(),
    })),
    markets: z.array(z.any()),
    totalValueUsd: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const snapshot = await readVaultBalances(publicClient, vaultAddress as Address);
      return {
        type: 'balance-check' as const,
        success: true,
        ...snapshot,
      };
    } catch (error) {
      return {
        type: 'balance-check' as const,
        success: false,
        assets: [],
        markets: [],
        totalValueUsd: '0.00',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 2. YO Treasury balance tool

**File**: `packages/mastra/src/tools/yo-treasury/read-treasury-balances-tool.ts` (new file)
**Changes**: Lightweight wrapper around existing `readYoTreasuryBalances()` + `mapYoPositionsToMarkets()`.

```ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';
import { readYoTreasuryBalances } from './read-yo-treasury-balances';
import { mapYoPositionsToMarkets } from './map-yo-to-market-balances';

export const readTreasuryBalancesTool = createTool({
  id: 'read-treasury-balances',
  description: `Read the treasury vault's current token balances and YO vault positions.
Returns unallocated tokens and YO vault share positions with USD values.
Use this to check available balances before creating allocation, withdrawal, or swap actions.
This tool does NOT render UI — it returns raw data for your reasoning.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID'),
  }),
  outputSchema: z.object({
    type: z.literal('balance-check'),
    success: z.boolean(),
    assets: z.array(z.object({
      address: z.string(),
      name: z.string(),
      symbol: z.string(),
      decimals: z.number(),
      balance: z.string(),
      balanceFormatted: z.string(),
      priceUsd: z.string(),
      valueUsd: z.string(),
    })),
    markets: z.array(z.any()),
    totalValueUsd: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const snapshot = await readYoTreasuryBalances(publicClient, vaultAddress as Address);
      return {
        type: 'balance-check' as const,
        success: true,
        assets: snapshot.assets,
        markets: mapYoPositionsToMarkets(snapshot.yoPositions),
        totalValueUsd: snapshot.totalValueUsd,
      };
    } catch (error) {
      return {
        type: 'balance-check' as const,
        success: false,
        assets: [],
        markets: [],
        totalValueUsd: '0.00',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 3. Update yo-treasury index

**File**: `packages/mastra/src/tools/yo-treasury/index.ts`
**Changes**: Remove `getYoVaultsTool`, `getTreasuryAllocationTool` exports. Add `readTreasuryBalancesTool`.

```ts
export { createYoAllocationActionTool } from './create-yo-allocation-action';
export { createYoWithdrawActionTool } from './create-yo-withdraw-action';
export { createYoSwapActionTool } from './create-yo-swap-action';
export { readTreasuryBalancesTool } from './read-treasury-balances-tool';
export { readYoTreasuryBalances } from './read-yo-treasury-balances';
export { mapYoPositionsToMarkets } from './map-yo-to-market-balances';
export type {
  TreasuryAsset,
  YoPosition,
  TreasuryBalanceSnapshot,
} from './read-yo-treasury-balances';
export { existingActionSchema } from './types';
```

#### 4. Delete deprecated tool files

- `packages/mastra/src/tools/alpha/display-pending-actions.ts` — delete
- `packages/mastra/src/tools/alpha/execute-pending-actions.ts` — delete
- `packages/mastra/src/tools/alpha/get-market-balances.ts` — delete
- `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` — delete
- `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts` — delete

### Success Criteria:

#### Automated Verification:
- [ ] No import errors for the new balance tools
- [ ] Old tool files are deleted

---

## Phase 3: Backend — Modify Action Creation Tools

### Overview
All 6 action creation tools switch from returning `ActionWithSimulationOutput` to using `buildTransactionProposal()` to return `TransactionProposalOutput`. Add `isReady` input. Expand `existingPendingActions` to full schema. Format descriptions with human-readable amounts.

### Changes Required:

#### 1. Shared: Token amount formatting helper

**File**: `packages/mastra/src/tools/alpha/format-amount.ts` (new file)

```ts
import { formatUnits } from 'viem';

/** Format a raw token amount to human-readable string */
export function formatTokenAmount(amount: string, decimals: number): string {
  return formatUnits(BigInt(amount), decimals);
}
```

#### 2. YO: Static decimals/symbol lookup

**File**: `packages/mastra/src/tools/yo-treasury/yo-vault-metadata.ts` (new file)

```ts
/** Static token metadata for YO vault underlying assets */
export const YO_UNDERLYING: Record<string, { decimals: number; symbol: string }> = {
  yoUSD: { decimals: 6, symbol: 'USDC' },
  yoETH: { decimals: 18, symbol: 'WETH' },
  yoBTC: { decimals: 8, symbol: 'cbBTC' },
  yoEUR: { decimals: 6, symbol: 'EURC' },
  yoGOLD: { decimals: 6, symbol: 'XAUt' },
  yoUSDT: { decimals: 6, symbol: 'USDT' },
};
```

#### 3. Modify `createYoAllocationActionTool`

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-allocation-action.ts`
**Changes**:
- Import `buildTransactionProposal` from `../alpha/build-transaction-proposal`
- Import `existingActionSchema` (expanded version with full fields)
- Import `formatTokenAmount` and `YO_UNDERLYING`
- Add `isReady: z.boolean()` to inputSchema
- Replace `existingPendingActions` schema with expanded version
- Replace simulation + output assembly with `buildTransactionProposal()` call
- Format description: `"Allocate 50 USDC to yoUSD"` instead of `"Allocate 50000000 to yoUSD"`
- Change outputSchema type literal from `'action-with-simulation'` to `'transaction-proposal'`

Key execute function changes:
```ts
execute: async ({ vaultAddress, chainId, yoVaultId, yoVaultAddress, amount, callerAddress, existingPendingActions, isReady }) => {
  try {
    // ... existing fuse resolution + calldata encoding stays the same ...

    const meta = YO_UNDERLYING[yoVaultId] ?? { decimals: 0, symbol: yoVaultId };
    const formatted = formatTokenAmount(amount, meta.decimals);
    const description = `Allocate ${formatted} ${meta.symbol} to ${yoVaultId}`;

    return buildTransactionProposal({
      newAction: {
        success: true,
        protocol: 'yo-erc4626',
        actionType: 'supply',
        description,
        fuseActions: newFuseActions,
      },
      existingPendingActions,
      vaultAddress,
      chainId,
      callerAddress,
      isReady,
    });
  } catch (error) {
    return buildTransactionProposal({
      newAction: {
        success: false,
        protocol: 'yo-erc4626',
        actionType: 'supply',
        description: `Failed: allocate to ${yoVaultId}`,
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      },
      existingPendingActions,
      vaultAddress,
      chainId,
      callerAddress,
      isReady: false,
    });
  }
},
```

#### 4. Modify `createYoWithdrawActionTool`

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-withdraw-action.ts`
**Changes**: Same pattern as allocation. Format description: `"Withdraw all from yoUSD"` or `"Withdraw 100 USDC worth of shares from yoUSD"`. Use `buildTransactionProposal()`.

#### 5. Modify `createYoSwapActionTool`

**File**: `packages/mastra/src/tools/yo-treasury/create-yo-swap-action.ts`
**Changes**: Same pattern. Add optional `tokenInSymbol`, `tokenInDecimals`, `tokenOutSymbol` inputs for human-readable descriptions. Format: `"Swap 50 USDC → WETH via Odos"`. Use `buildTransactionProposal()`.

#### 6. Modify `createAaveV3ActionTool`

**File**: `packages/mastra/src/tools/alpha/create-aave-v3-action.ts`
**Changes**:
- Remove inline `existingActionSchema` definition — import from `../yo-treasury/types` (or create shared location)
- Add `isReady: z.boolean()` input
- Add optional `tokenSymbol: z.string()`, `tokenDecimals: z.number()` inputs
- Use `buildTransactionProposal()`
- Format description: `"Aave V3 supply 1,000 USDC"` when symbol/decimals available, fallback to current format

#### 7. Modify `createMorphoActionTool`

**File**: `packages/mastra/src/tools/alpha/create-morpho-action.ts`
**Changes**: Same pattern as Aave. Format: `"Morpho supply 1,000 USDC in market 0xabcd..."`.

#### 8. Modify `createEulerV2ActionTool`

**File**: `packages/mastra/src/tools/alpha/create-euler-v2-action.ts`
**Changes**: Same pattern. Format: `"Euler V2 supply 1,000 USDC in vault 0xabcd..."`.

#### 9. Move `existingActionSchema` to shared location

**File**: `packages/mastra/src/tools/shared/pending-action-schema.ts`
**Changes**: Export the expanded `existingActionSchema` from here so both alpha and yo-treasury tools import from the same place. Remove the duplicate definitions from alpha tool files and `yo-treasury/types.ts`.

```ts
/** Schema for existing pending actions passed to action tools — must match working memory shape */
export const existingActionSchema = z.object({
  id: z.string(),
  protocol: z.string(),
  actionType: z.string(),
  description: z.string(),
  fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
});
```

#### 10. Update `TransactionProposalOutput` Zod output schema

All 6 action tools need a shared output schema for Mastra. Create it once:

**File**: `packages/mastra/src/tools/alpha/build-transaction-proposal.ts` (add to existing)

```ts
export const transactionProposalOutputSchema = z.object({
  type: z.literal('transaction-proposal'),
  status: z.enum(['partial', 'ready']),
  actions: z.array(z.object({
    id: z.string(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
  })),
  newAction: z.object({
    success: z.boolean(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    error: z.string().optional(),
  }),
  simulation: z.any().optional(),
  vaultAddress: z.string(),
  chainId: z.number(),
  flatFuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
  actionsCount: z.number(),
  fuseActionsCount: z.number(),
  actionsSummary: z.string(),
});
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-mastra tsc --noEmit`
- [ ] All action tools return `type: 'transaction-proposal'`
- [ ] No references to `displayPendingActionsTool` or `executePendingActionsTool` remain

#### Manual Verification:
- [ ] Start Mastra dev server, call each action tool via API, verify output shape matches `TransactionProposalOutput`

**Implementation Note**: After this phase, the backend is complete. Frontend will temporarily show nothing for tool outputs (ToolRenderer won't match `'transaction-proposal'`). Proceed to Phase 4.

---

## Phase 4: Frontend — TransactionProposal Component

### Overview
Create a single `TransactionProposal` component that replaces all four existing components. Refactor `SimulationBalanceComparison` to work without its own Card wrapper. Extract execute wizard logic.

### Changes Required:

#### 1. Refactor `SimulationBalanceComparison` — remove Card wrapper

**File**: `packages/web/src/alpha/tools/action-with-simulation/simulation-balance-comparison.tsx`
**Changes**: Change the outer `<Card className="p-4 space-y-4">` (line 225) to `<div className="space-y-4">`. The parent `TransactionProposal` will provide the card context.

#### 2. Create `TransactionProposal` component

**File**: `packages/web/src/alpha/tools/transaction-proposal/transaction-proposal.tsx` (new file)

This is the unified component. Structure:

```tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Wallet, Loader2, Zap,
  ChevronDown, ChevronRight, Copy, Check, AlertCircle,
} from 'lucide-react';
import {
  useAccount, useConnect, useSwitchChain,
  useReadContract, usePublicClient, useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import type { Address, Hex } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import { useQueryClient } from '@tanstack/react-query';
import { ProtocolIcon, getProtocolLabel } from '@/components/protocol-icon/protocol-icon';
import { SimulationBalanceComparison } from '../action-with-simulation/simulation-balance-comparison';
import { TxHashLink } from '@/activity/components/tx-hash-link';
import type { TransactionProposalOutput, BalanceSnapshot } from '@wgenie/fusion-mastra/alpha-types';

// ABIs — same as current execute-actions.tsx
const ALPHA_ROLE_ID = 200n;
// ... (getAccessManagerAbi, hasRoleAbi, plasmaVaultExecuteAbi — copy from execute-actions.tsx)

interface Props extends TransactionProposalOutput {
  // chainId comes from ToolPartProps, not from the output (output also has it)
}

export function TransactionProposal(props: Props) {
  const {
    status, actions, newAction, simulation,
    vaultAddress, chainId, flatFuseActions,
    actionsCount, fuseActionsCount, actionsSummary,
  } = props;

  // === SECTION 1: Action List ===
  // Show all pending actions with protocol icon, description, expandable raw payload

  // === SECTION 2: New Action Status ===
  // If newAction.success === false, show error alert
  // If newAction.success === true, can optionally highlight the latest action in the list

  // === SECTION 3: Simulation ===
  // Always show when available (both partial and ready)
  // Reuse SimulationBalanceComparison for before/after diff

  // === SECTION 4: Status Indicator ===
  // If status === 'partial': show "Preparing more actions..." with spinning indicator
  // If status === 'ready': show execute wizard (Steps 1-5 from current ExecuteActions)

  // === SECTION 5: Execute Wizard (only when ready) ===
  // Copy wallet connection + role check + simulate + execute logic from execute-actions.tsx
  // Same hooks: useAccount, useConnect, useSwitchChain, useReadContract (x2), useWriteContract, useWaitForTransactionReceipt
  // Same auto-skip simulation pattern
  // Same query invalidation on confirmation

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <p className="text-sm font-medium">
          Transaction Proposal — {actionsCount} action{actionsCount === 1 ? '' : 's'}
        </p>
      </div>

      {/* Action list */}
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionItem key={action.id} action={action} />
        ))}
      </div>

      {/* New action error */}
      {!newAction.success && newAction.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{newAction.error}</span>
        </div>
      )}

      {/* Simulation diff */}
      {simulation && simulation.success && simulation.balancesBefore && simulation.balancesAfter && (
        <SimulationBalanceComparison
          before={simulation.balancesBefore as BalanceSnapshot}
          after={simulation.balancesAfter as BalanceSnapshot}
          chainId={chainId}
        />
      )}
      {simulation && !simulation.success && simulation.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Simulation failed: {simulation.error}</span>
        </div>
      )}

      {/* Partial indicator */}
      {status === 'partial' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Preparing more actions...</span>
        </div>
      )}

      {/* Execute wizard — only when ready */}
      {status === 'ready' && (
        <ExecuteSection
          vaultAddress={vaultAddress}
          chainId={chainId}
          flatFuseActions={flatFuseActions}
        />
      )}
    </Card>
  );
}

// ActionItem — simplified from pending-actions-list.tsx
// ProtocolIcon + description + expandable raw payload

// ExecuteSection — extracted from execute-actions.tsx
// All wallet hooks, role check, auto-skip simulation, execute + confirmation
```

The `ActionItem` sub-component reuses the pattern from `pending-actions-list.tsx:18-77` (protocol icon, description, expandable raw payload with copy).

The `ExecuteSection` sub-component contains the full wallet flow from `execute-actions.tsx:87-484` (hooks, role check, auto-skip simulation, StepRow rendering).

#### 3. Create Storybook stories

**File**: `packages/web/src/alpha/tools/transaction-proposal/transaction-proposal.stories.tsx` (new file)

Stories:
- `SingleActionReady` — 1 action, status='ready', simulation with before/after
- `MultipleActionsPartial` — 2 actions, status='partial', simulation, preparing indicator
- `MultipleActionsReady` — 3 actions, status='ready', full execute wizard
- `ActionFailed` — newAction.success=false, error message
- `SimulationFailed` — simulation.success=false, error

Use `WalletDecorator` for execute wizard functionality.

#### 4. Update ToolRenderer

**File**: `packages/web/src/alpha/tools/tool-renderer.tsx`
**Changes**: Replace all four cases with two: `'transaction-proposal'` and `'balance-check'` (returns null).

```tsx
import { Loader2 } from 'lucide-react';
import { TransactionProposal } from './transaction-proposal/transaction-proposal';
import type { ToolPartProps } from '../agent-chat';
import type { TransactionProposalOutput } from '@wgenie/fusion-mastra/alpha-types';

export function ToolRenderer({ state, output, chainId }: ToolPartProps) {
  if (state === 'input-available' || state === 'input-streaming') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  }

  if (state !== 'output-available' || !output) {
    return null;
  }

  const typed = output as { type: string };

  switch (typed.type) {
    case 'transaction-proposal': {
      const proposal = typed as TransactionProposalOutput;
      return <TransactionProposal {...proposal} />;
    }
    case 'balance-check':
      // Lightweight balance data — not rendered, agent uses it internally
      return null;
    default:
      return null;
  }
}
```

#### 5. Update `@wgenie/fusion-mastra/alpha-types` package export

**File**: `packages/mastra/package.json`
**Changes**: The `"./alpha-types": "./src/tools/alpha/types.ts"` export stays the same — we're modifying the types file in Phase 1 to export the new types.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-web typecheck`
- [ ] Storybook builds: `pnpm --filter @wgenie/fusion-web storybook build` (or just starts without errors)
- [ ] No imports of old components (`MarketBalancesList`, `ActionWithSimulation`, `PendingActionsList`, `ExecuteActions`) remain in `tool-renderer.tsx`

#### Manual Verification:
- [ ] Storybook stories render correctly for all variants (single action, multi-action partial, multi-action ready, errors)
- [ ] Execute wizard works: connect wallet → role check → execute in the story

**Implementation Note**: After this phase, the full frontend is functional. Proceed to update agent instructions.

---

## Phase 5: Agent Instructions

### Overview
Update both agent definitions to use new tools and updated instructions. Remove TVL/APR language from YO agent. Remove `[UI rendered…]` sentinel references. Update workflow to reflect new flow.

### Changes Required:

#### 1. Update `yoTreasuryAgent`

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts`
**Changes**:
- Remove `getYoVaultsTool`, `getTreasuryAllocationTool` imports → add `readTreasuryBalancesTool`
- Remove `displayPendingActionsTool`, `executePendingActionsTool` imports
- Update `tools` object: `readTreasuryBalancesTool`, `createYoAllocationActionTool`, `createYoWithdrawActionTool`, `createYoSwapActionTool`
- Rewrite instructions:

Key instruction changes:
- Remove "### Read Information" section about TVL/APY
- Remove getYoVaultsTool and getTreasuryAllocationTool references
- Add `readTreasuryBalancesTool` for balance checking (explain it returns data, no UI)
- Remove "### Display & Execute" section — folded into action tools
- Update WORKFLOW:
  1. Check balances with `readTreasuryBalancesTool` to resolve token amounts
  2. Create actions — each action tool returns a unified `TransactionProposal` card
  3. Set `isReady: false` for intermediate actions, `isReady: true` for the last
  4. For single actions: set `isReady: true` immediately
  5. Store successful actions in working memory (same as before)
  6. The execute button appears automatically in the last proposal card — no need to call a separate execute tool
- Remove all `[...]` message references
- Update IMPORTANT RULES to reference new tools
- Remove "EXECUTION" section (folded into workflow)
- Keep TOKEN ADDRESSES and SWAP INFRASTRUCTURE reference tables

#### 2. Update `alphaAgent`

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**:
- Remove `getMarketBalancesTool`, `displayPendingActionsTool`, `executePendingActionsTool` imports → add `readVaultBalancesTool`
- Update `tools` object
- Rewrite instructions:

Key instruction changes:
- Replace `getMarketBalancesTool` references with `readVaultBalancesTool`
- Explain that `readVaultBalancesTool` returns data for reasoning, not UI
- Remove "Display actions" section (step 6 in current workflow)
- Update WORKFLOW: balance check → create actions with `isReady` flag → execute button appears automatically
- Remove EXECUTION section
- Add guidance on `isReady` flag: `true` for single-action requests, `false`/`true` pattern for multi-action
- Add note about `tokenSymbol` and `tokenDecimals` optional inputs — pass them from balance check results for human-readable descriptions
- Keep BORROWING & REPAYING section

#### 3. Increase `maxSteps` in API route

**File**: `packages/web/src/app/api/yo/treasury/chat/route.ts`
**Changes**: Consider increasing `maxSteps: 5` to `maxSteps: 7` to accommodate multi-action flows (balance check + N action creations).

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles for both packages
- [ ] Agent tools object contains only valid tool references

#### Manual Verification:
- [ ] Agent responds correctly to "allocate 50 USDC to yoUSD" (single action flow)
- [ ] Agent responds correctly to "swap 100 USDC to WETH and allocate to yoETH" (multi-action flow)
- [ ] No `[UI rendered…]` messages appear in chat
- [ ] Token amounts displayed as "50 USDC" not "50000000"

**Implementation Note**: After this phase, the full system is functional. Proceed to cleanup and testing.

---

## Phase 6: Cleanup & Testing

### Overview
Remove dead code, update Storybook stories, run Playwright tests against the yo-treasury chat.

### Changes Required:

#### 1. Delete deprecated frontend components

- `packages/web/src/alpha/tools/market-balances/` — entire directory (component + stories)
- `packages/web/src/alpha/tools/action-with-simulation/action-with-simulation.tsx` — delete (keep `simulation-balance-comparison.tsx` — still used)
- `packages/web/src/alpha/tools/action-with-simulation/action-with-simulation.stories.tsx` — delete
- `packages/web/src/alpha/tools/pending-actions/` — entire directory
- `packages/web/src/alpha/tools/execute-actions/` — entire directory

#### 2. Delete deprecated backend tool files

(Already done in Phase 2, verify they're gone)

#### 3. Clean up old type exports

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Remove the old type definitions that were kept temporarily (`PendingActionsOutput`, `MarketBalancesOutput`, `ExecuteActionsOutput`, `ActionWithSimulationOutput`). Keep `BalanceSnapshot`, `MarketAllocation`, `MarketPosition`.

#### 4. Playwright testing

Test against: `http://localhost:6007/iframe.html?globals=theme%3Adark&args=&id=yo-treasury-chat--default&viewMode=story`

Using `playwright-cli` with `--headed` mode.

Test scenarios:
1. **Single allocation**: Type "allocate 50 USDC to yoUSD" → verify:
   - Agent calls balance tool (no UI rendered)
   - Agent calls allocation tool → unified card appears with 1 action + simulation + execute wizard
   - No `[...]` messages in chat
   - Amount shown as "50 USDC" not "50000000"

2. **Multi-step flow**: Type "swap 100 USDC to WETH and then allocate to yoETH" → verify:
   - First card: 1 action (swap), simulation, "Preparing more actions..."
   - Second card: 2 actions (swap + allocate), simulation, execute wizard visible

3. **Withdraw flow**: Type "withdraw all from yoUSD" → verify:
   - Card appears with withdraw action + simulation + execute
   - Description shows human-readable share amount

4. **Error handling**: Verify simulation failure shows error message in the card

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles clean: `pnpm --filter @wgenie/fusion-web typecheck && pnpm --filter @wgenie/fusion-mastra tsc --noEmit`
- [ ] No references to deleted files in imports
- [ ] Storybook starts without errors on port 6007

#### Manual Verification:
- [ ] All Playwright test scenarios pass visually
- [ ] Execute wizard works end-to-end (connect → role → execute) in Storybook
- [ ] Chat UI is clean — no sentinel messages, no raw token amounts

---

## Testing Strategy

### Unit Tests
- `buildTransactionProposal()` — verify output shape for success/failure/partial/ready
- `formatTokenAmount()` — verify formatting for different decimals

### Integration Tests (Playwright)
- Yo-treasury Storybook chat: single action, multi-action, withdraw, error flows
- Verify no UI regressions (simulation diff renders, execute wizard works)

### Manual Testing Steps
1. Start Mastra dev + Storybook
2. Open yo-treasury chat story
3. Test each scenario listed in Phase 6
4. Connect wallet and verify execute flow

## Performance Considerations

- Simulation now runs on EVERY action queue modification. For a 3-action sequence, that's 3 Anvil fork spawns. This is the same as the current behavior (each action tool already simulates the cumulative batch), so no regression.
- Odos swap calldata expiry (~2 min): single-action flows are fine. Multi-action flows with swaps should keep swap as the last action or set `isReady: true` on it to minimize delay.

## Migration Notes

- `@wgenie/fusion-mastra/alpha-types` export changes: `TransactionProposalOutput` and `BalanceCheckOutput` replace the 4 old types
- Working memory schema is unchanged — `pendingActions` array stays the same
- API routes unchanged — same endpoints, same body shape
- `AgentChat` component unchanged — same props, just new `ToolRenderer` behavior

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0080-refactor-alpha-tools.md`
- Prior plan: `thoughts/shared/plans/2026-03-18-FSN-0079-consolidate-alpha-tools-yo-treasury.md`
- Alpha agent: `packages/mastra/src/agents/alpha-agent.ts`
- YO treasury agent: `packages/mastra/src/agents/yo-treasury-agent.ts`
- Shared types: `packages/mastra/src/tools/alpha/types.ts`
- Tool renderer: `packages/web/src/alpha/tools/tool-renderer.tsx`
- Storybook test URL: `http://localhost:6007/iframe.html?globals=theme%3Adark&args=&id=yo-treasury-chat--default&viewMode=story`
