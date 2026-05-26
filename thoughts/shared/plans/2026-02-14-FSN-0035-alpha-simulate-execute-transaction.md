# FSN-0035: Alpha Agent Simulate & Execute Transaction

## Overview

Add simulation and execution capabilities to the Alpha Agent's pending actions workflow. Simulation is a Mastra tool (available in Studio + web app). Execution (wallet signing) is frontend-only in the web app. The user always manually approves transactions.

**Depends on**: FSN-0034 (working memory, SDK action tools, pending actions list)

## Current State Analysis

- **Pending actions** are built via SDK tools and stored in Alpha Agent's working memory
- **`displayPendingActionsTool`** renders a `PendingActionsList` component showing actions with raw payload toggle
- **PlasmaVault contract** has `execute(FuseAction[] calldata calls_)` function — only callable by accounts with ALPHA_ROLE (200)
- **SDK's `PlasmaVault.execute()`** at `packages/sdk/src/PlasmaVault.ts:132-148` already does `simulateContract → writeContract` on the server side
- **wagmi v3** is set up in the web app with injected connector, AppProviders wraps the ask-ai page via `VaultDetailLayout`
- **No transaction writing** exists anywhere in the web app yet
- **PlasmaVault execute ABI** is at `packages/sdk/src/abi/plasma-vault.abi.ts:727-750` — just the execute function portion will be inlined

### Key Discoveries:

- `PlasmaVault.execute()` accepts `FuseAction[][]` and flattens internally — we'll flatten when building the simulation
- `simulateContract` only needs `account` address for `msg.sender` context, no private key needed
- wagmi's `useWriteContract` is the first transaction-writing pattern in this codebase
- The ask-ai page is already wrapped in `AppProviders` → `WagmiProvider` via the vault detail layout (`packages/web/src/app/vaults/[chainId]/[address]/layout.tsx:30-38`)
- `VaultAskAi` component already receives `chainId` and `vaultAddress` props (`packages/web/src/vault-details/components/vault-ask-ai.tsx:15-18`)

## Desired End State

1. **`simulatePendingActionsTool`** — Mastra tool that simulates executing pending actions on-chain via `publicClient.simulateContract()`
2. **Simulation result UI** — New `SimulationResult` component renders success/failure with gas estimate
3. **Execute button** — In the simulation result component (web app only), an "Execute Transaction" button that sends the transaction to the user's wallet for signing
4. **Connect wallet** — If user isn't connected, show "Connect Wallet" button before Execute
5. **Transaction feedback** — Show tx hash, confirmation status, and errors

### Verification:
- In Mastra Studio: build actions → "simulate these actions with caller 0x..." → simulation result JSON shows success/failure
- In web app: build actions → "simulate" → simulation result component shows success → click "Execute" → wallet popup → sign → tx confirmed
- User can always reject the transaction in their wallet

## What We're NOT Doing

- Tenderly integration (using viem's built-in `simulateContract` via RPC `eth_call`)
- Automatic execution — user always clicks Execute manually
- Reading ALPHA_ROLE on-chain — user provides their address, simulation validates access
- Adding `@wgenie/fusion-sdk` as web dependency — inline the execute ABI
- Batch execution of action subsets — all pending actions execute as one batch

## Implementation Approach

1. Create a `simulatePendingActionsTool` in Mastra that takes the actions, vault address, chain ID, and caller address
2. Add `SimulationResultOutput` to the discriminated type system
3. Create a `SimulationResult` React component with optional Execute button
4. Thread `vaultAddress` + `chainId` props through AlphaToolRenderer to child components
5. Create a `useExecuteActions` hook in the web app using wagmi's `useWriteContract`
6. Update agent instructions to teach the simulation → execution workflow

---

## Phase 1: Create Simulation Tool in Mastra

### Overview
Create a `simulatePendingActionsTool` that takes the pending actions from working memory, flattens the fuse actions, and runs `publicClient.simulateContract()` to validate the transaction would succeed on-chain.

### Changes Required:

#### 1. Create simulation tool

**File**: `packages/mastra/src/tools/alpha/simulate-pending-actions.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';

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

export const simulatePendingActionsTool = createTool({
  id: 'simulate-pending-actions',
  description: `Simulate executing pending fuse actions on a PlasmaVault contract.
Uses eth_call to validate the transaction would succeed without actually sending it.
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
    // Include the flat fuse actions so the frontend can execute them
    flatFuseActions: z.array(z.object({
      fuse: z.string(),
      data: z.string(),
    })),
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

      return {
        type: 'simulation-result' as const,
        success: true,
        message: `Simulation successful! ${flatFuseActions.length} fuse action${flatFuseActions.length === 1 ? '' : 's'} from ${actions.length} pending action${actions.length === 1 ? '' : 's'} would execute successfully.`,
        vaultAddress,
        chainId,
        callerAddress,
        actionsCount: actions.length,
        fuseActionsCount: flatFuseActions.length,
        flatFuseActions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        type: 'simulation-result' as const,
        success: false,
        message: `Simulation failed: ${errorMessage}`,
        vaultAddress,
        chainId,
        callerAddress,
        actionsCount: actions.length,
        fuseActionsCount: flatFuseActions.length,
        error: errorMessage,
        flatFuseActions,
      };
    }
  },
});
```

#### 2. Export from alpha tools index

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Add export for the new tool

```typescript
export { displayTransactionsTool } from './display-transactions';
export { displayPendingActionsTool } from './display-pending-actions';
export { createAaveV3ActionTool } from './create-aave-v3-action';
export { createMorphoActionTool } from './create-morpho-action';
export { createEulerV2ActionTool } from './create-euler-v2-action';
export { simulatePendingActionsTool } from './simulate-pending-actions';
export type { AlphaToolOutput, TransactionsToSignOutput, PendingActionsOutput, SimulationResultOutput } from './types';
```

#### 3. Register tool on alpha agent

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Import and add to tools object

```typescript
import {
  displayPendingActionsTool,
  createAaveV3ActionTool,
  createMorphoActionTool,
  createEulerV2ActionTool,
  simulatePendingActionsTool,
} from '../tools/alpha';

// ... in agent config:
  tools: {
    displayPendingActionsTool,
    createAaveV3ActionTool,
    createMorphoActionTool,
    createEulerV2ActionTool,
    simulatePendingActionsTool,
  },
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] `cd packages/mastra && pnpm dev` starts — `simulate-pending-actions` tool visible in Studio

#### Manual Verification:
- [ ] In Studio: Call the simulate tool with test params → returns simulation result
- [ ] In Studio: Ask agent "simulate my pending actions with caller 0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6 on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 chain 1" → agent calls tool and returns result

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Add SimulationResultOutput Type & Frontend Component

### Overview
Add `SimulationResultOutput` to the discriminated type system. Create a `SimulationResult` React component that shows success/failure status. When successful in the web app, show a "Connect Wallet" or "Execute Transaction" button that uses wagmi's `useWriteContract` to send the transaction for the user to approve.

### Changes Required:

#### 1. Update alpha types

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Add `SimulationResultOutput` type

```typescript
/**
 * Discriminated union for all Alpha Agent tool outputs.
 */

/** Placeholder: displays a list of transactions to sign */
export type TransactionsToSignOutput = {
  type: 'transactions-to-sign';
  message: string;
  placeholder: true;
};

/** Displays the list of pending fuse actions from working memory */
export type PendingActionsOutput = {
  type: 'pending-actions';
  actions: Array<{
    id: string;
    protocol: 'aave-v3' | 'morpho' | 'euler-v2';
    actionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
    description: string;
    fuseActions: Array<{
      fuse: string;
      data: string;
    }>;
  }>;
  message: string;
};

/** Displays simulation result with optional execute button */
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
};

/** Union of all alpha tool output types */
export type AlphaToolOutput =
  | TransactionsToSignOutput
  | PendingActionsOutput
  | SimulationResultOutput;
```

#### 2. Create SimulationResult component

**File**: `packages/web/src/vault-details/components/simulation-result.tsx` (new)

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Wallet,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { injected } from 'wagmi/connectors';
import type { Address, Hex } from 'viem';
import type { SimulationResultOutput } from '@wgenie/fusion-mastra/alpha-types';

/** Minimal ABI for PlasmaVault.execute(FuseAction[]) */
const plasmaVaultExecuteAbi = [
  {
    type: 'function' as const,
    name: 'execute' as const,
    inputs: [
      {
        name: 'calls_' as const,
        type: 'tuple[]' as const,
        components: [
          { name: 'fuse' as const, type: 'address' as const },
          { name: 'data' as const, type: 'bytes' as const },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const;

interface Props {
  success: SimulationResultOutput['success'];
  message: SimulationResultOutput['message'];
  vaultAddress: SimulationResultOutput['vaultAddress'];
  chainId: SimulationResultOutput['chainId'];
  error?: SimulationResultOutput['error'];
  flatFuseActions: SimulationResultOutput['flatFuseActions'];
  actionsCount: SimulationResultOutput['actionsCount'];
  fuseActionsCount: SimulationResultOutput['fuseActionsCount'];
}

export function SimulationResult({
  success,
  message,
  vaultAddress,
  chainId,
  error,
  flatFuseActions,
  actionsCount,
  fuseActionsCount,
}: Props) {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const handleConnect = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const handleExecute = useCallback(() => {
    writeContract({
      address: vaultAddress as Address,
      abi: plasmaVaultExecuteAbi,
      functionName: 'execute',
      args: [flatFuseActions.map(a => ({
        fuse: a.fuse as Address,
        data: a.data as Hex,
      }))],
      chainId,
    });
  }, [writeContract, vaultAddress, flatFuseActions, chainId]);

  return (
    <Card className={`p-4 space-y-3 ${success ? 'border-green-500/50' : 'border-destructive/50'}`}>
      {/* Status header */}
      <div className="flex items-center gap-2">
        {success ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive" />
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>

      {/* Error details */}
      {error && (
        <pre className="text-xs bg-destructive/10 text-destructive rounded p-2 overflow-auto max-h-32">
          {error}
        </pre>
      )}

      {/* Action summary */}
      {success && (
        <p className="text-xs text-muted-foreground">
          {actionsCount} action{actionsCount === 1 ? '' : 's'}, {fuseActionsCount} fuse call{fuseActionsCount === 1 ? '' : 's'}
        </p>
      )}

      {/* Execute section — only when simulation succeeded */}
      {success && !isConfirmed && (
        <div className="pt-2 border-t space-y-2">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              Connect Wallet to Execute
            </Button>
          ) : (
            <Button
              onClick={handleExecute}
              disabled={isWriting || isConfirming}
              size="sm"
              className="w-full"
            >
              {isWriting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Confirm in wallet...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Waiting for confirmation...
                </>
              ) : (
                'Execute Transaction'
              )}
            </Button>
          )}

          {/* Write error */}
          {writeError && (
            <div className="space-y-1">
              <p className="text-xs text-destructive">
                Transaction failed: {writeError.message.slice(0, 200)}
              </p>
              <Button variant="ghost" size="sm" onClick={() => resetWrite()}>
                Try again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tx hash & confirmation */}
      {txHash && (
        <div className="pt-2 border-t">
          {isConfirmed ? (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Transaction confirmed!</span>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </p>
        </div>
      )}
    </Card>
  );
}
```

#### 3. Add case to AlphaToolRenderer

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
**Changes**: Import `SimulationResult` and add `case 'simulation-result'`

```tsx
import { Loader2 } from 'lucide-react';
import { TransactionsToSign } from './transactions-to-sign';
import { PendingActionsList } from './pending-actions-list';
import { SimulationResult } from './simulation-result';
import type { AlphaToolOutput } from '@wgenie/fusion-mastra/alpha-types';

interface ToolPartProps {
  state: string;
  output?: unknown;
}

export function AlphaToolRenderer({ state, output }: ToolPartProps) {
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

  const typed = output as AlphaToolOutput;

  switch (typed.type) {
    case 'transactions-to-sign':
      return <TransactionsToSign message={typed.message} />;
    case 'pending-actions':
      return <PendingActionsList actions={typed.actions} message={typed.message} />;
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
        />
      );
    default:
      return (
        <pre className="text-xs bg-muted rounded p-2 overflow-auto">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] `cd packages/web && npx tsc --noEmit` compiles
- [ ] `cd packages/web && pnpm build` succeeds

#### Manual Verification:
- [ ] In Studio: Agent calls simulate tool → JSON output has `type: 'simulation-result'`
- [ ] In web app: Agent calls simulate tool → SimulationResult component renders with green check (success) or red X (failure)
- [ ] In web app: Click "Connect Wallet" → wallet popup appears
- [ ] In web app: After connecting, "Execute Transaction" button appears
- [ ] In web app: Click Execute → wallet prompts for transaction approval
- [ ] In web app: After approval → tx hash shown, confirmation status updates

**Implementation Note**: After completing this phase and all verification passes, pause for manual testing.

---

## Phase 3: Update Agent Instructions

### Overview
Update the Alpha Agent's system prompt to teach it the simulate → execute workflow. The agent should know to ask for the caller address and call the simulation tool when users want to simulate or execute their pending actions.

### Changes Required:

#### 1. Update agent instructions

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Extend the `instructions` string to include simulation workflow

Add the following sections to the existing instructions:

```
## SIMULATION & EXECUTION

When the user asks to simulate, test, validate, or execute their pending actions:

1. Ask for their wallet address (the caller) if not already provided. This address must have ALPHA_ROLE on the vault.
2. Call simulatePendingActionsTool with:
   - vaultAddress and chainId from the conversation context
   - callerAddress from the user
   - actions from your working memory's pendingActions
3. The simulation result shows whether the transaction would succeed on-chain.
4. If simulation succeeds, the web app UI will show an "Execute Transaction" button for the user to sign with their wallet.
5. NEVER execute transactions yourself. The user must always manually approve in their wallet.

When the user asks to execute directly (without simulating first):
- Always simulate first. Tell the user you're simulating before execution.
- Only after successful simulation will the Execute button appear in the UI.
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles

#### Manual Verification:
- [ ] In Studio: Ask "simulate my pending actions" → agent asks for caller address → calls simulate tool
- [ ] In Studio: Ask "execute my actions" → agent simulates first, explains the user needs to approve in the web app
- [ ] In web app: Full flow works end-to-end (build → simulate → execute)

**Implementation Note**: After completing this phase and all verification passes, pause for manual testing.

---

## Phase 4: Browser Testing

### Test Steps:

1. Start Mastra dev server: `cd packages/mastra && pnpm dev`
2. Start web app: `cd packages/web && pnpm dev`

#### Mastra Studio (localhost:4111):
- Navigate to alpha agent chat
- Build actions: "Supply 1000000000 of asset 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 to Aave V3 on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 on chain 1"
- Show pending actions: "Show my pending actions"
- Simulate: "Simulate my pending actions with caller 0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6"
- Verify: Simulation result JSON with `type: 'simulation-result'` and `success: true/false`

#### Web App (localhost:3000):
- Navigate to `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai`
- Build action: "Supply 1000000000 USDC to Aave V3"
- Simulate: "Simulate my pending actions with caller 0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6"
- Verify: SimulationResult component renders with success/failure status
- If success: "Connect Wallet" button visible
- Connect wallet → "Execute Transaction" button appears
- Click Execute → wallet popup → sign → tx hash + confirmation shown

### Success Criteria:

#### Manual Verification:
- [ ] Studio: Simulation tool returns valid result (success or meaningful error)
- [ ] Studio: Simulation result JSON has correct `type: 'simulation-result'` discriminator
- [ ] Web app: SimulationResult component renders correctly for success case
- [ ] Web app: SimulationResult component renders correctly for failure case (red X, error message)
- [ ] Web app: Connect Wallet button works
- [ ] Web app: Execute Transaction button sends to wallet for approval
- [ ] Web app: Transaction confirmation/rejection handled gracefully
- [ ] Web app: "Try again" button appears on write errors
- [ ] No console errors in either environment

---

## Testing Strategy

### Unit Tests:
- None needed — simulation tool is a thin wrapper around `simulateContract`, and the component uses wagmi hooks

### Manual Testing Steps:
1. Build actions for Aave V3 protocol
2. Simulate with a valid alpha address → should succeed
3. Simulate with a non-alpha address → should fail with access error
4. Simulate with empty actions → should return "no actions" message
5. In web app: connect wallet → execute → approve in wallet
6. In web app: connect wallet → execute → reject in wallet → "Try again" visible
7. Test chain switching (if wallet is on wrong chain)

## Performance Considerations

- Simulation uses `eth_call` RPC — same cost as reading contract state, no gas spent
- `flatFuseActions` included in simulation output so the frontend doesn't need to reconstruct them
- Single RPC call for simulation regardless of number of actions

## New Files Summary

```
packages/mastra/src/tools/alpha/
├── simulate-pending-actions.ts  (new)
├── create-aave-v3-action.ts     (existing)
├── create-morpho-action.ts      (existing)
├── create-euler-v2-action.ts    (existing)
├── display-pending-actions.ts   (existing)
├── display-transactions.ts      (existing)
├── types.ts                     (extended with SimulationResultOutput)
└── index.ts                     (updated exports)

packages/web/src/vault-details/components/
├── simulation-result.tsx        (new)
├── pending-actions-list.tsx     (existing, unchanged)
└── alpha-tool-renderer.tsx      (extended with simulation-result case)
```

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0035-alpha-simplate-executing-transaction.md`
- FSN-0034 plan: `thoughts/shared/plans/2026-02-14-FSN-0034-alpha-agent-memory.md`
- Hardhat test: `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts`
- PlasmaVault.execute SDK: `packages/sdk/src/PlasmaVault.ts:132-148`
- PlasmaVault execute ABI: `packages/sdk/src/abi/plasma-vault.abi.ts:727-750`
- Wagmi config: `packages/web/src/app/wagmi-provider.tsx`
- Vault detail layout (AppProviders): `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`
