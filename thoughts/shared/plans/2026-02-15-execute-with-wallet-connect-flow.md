# Execute Function with Full Connect Wallet → Send TX Flow

## Overview

Create a new Mastra tool + React component that handles the complete execution flow client-side: **connect wallet → check ALPHA_ROLE → simulate transaction → execute transaction**. The Mastra tool prepares the fuse actions and passes them to the UI. The UI component drives the multi-step flow using wagmi hooks and on-chain reads.

## Current State Analysis

- `simulatePendingActionsTool` simulates server-side via `eth_call` and returns a `SimulationResult` component
- `SimulationResult` has connect + execute but:
  - **No ALPHA_ROLE check** — user gets a confusing revert if they don't have the role
  - **No chain switching** — tx fails silently on wrong chain
  - **Simulation is server-side** — the agent needs the caller address upfront
  - **No connected address displayed**

### Key Discoveries:

- ALPHA_ROLE = `200n` checked via AccessManager contract (`packages/sdk/src/access-manager/access-manager.types.ts:105`)
- Two-step on-chain check: `vault.getAccessManagerAddress()` → `accessManager.hasRole(200n, userAddress)` (`packages/sdk/src/PlasmaVault.ts:360-384`)
- Minimal ABIs needed: `getAccessManagerAddress` from plasma-vault ABI, `hasRole` from access-manager ABI (`packages/sdk/src/abi/plasma-vault.abi.ts:778`, `packages/sdk/src/abi/access-manager.abi.ts:486`)
- wagmi v3 provides `useSwitchChain`, `useAccount` (with `chain`), `useSimulateContract`, `useWriteContract`
- `AppProviders` wraps vault detail pages with `WagmiProvider` — wagmi hooks available

## Desired End State

When the user asks the agent to execute pending actions, a new `ExecuteActions` component renders with a multi-step flow:

1. **Connect wallet** → "Connect Wallet" button → `injected()` connector
2. **Check chain** → auto-detect wrong chain → "Switch to Base" button
3. **Check ALPHA_ROLE** → on-chain read → show error if no role
4. **Simulate** → client-side `simulateContract` using connected wallet as `account` → show success/failure
5. **Execute** → `writeContract` → confirm in wallet → track tx

The agent no longer needs to ask for a caller address — it comes from the connected wallet.

### Verification:
- `pnpm dev:web` and `pnpm dev:mastra`
- Navigate to vault ask-ai page
- Build pending actions, ask to execute
- Test: connect → chain switch → role check → simulate → execute → confirm

## What We're NOT Doing

- NOT adding RainbowKit or any wallet UI library (incompatible with wagmi v3)
- NOT removing the existing `simulatePendingActionsTool` / `SimulationResult` — keeping as fallback
- NOT adding a persistent ConnectButton to header/sidebar
- NOT changing wagmi provider configuration
- NOT adding WalletConnect — injected wallets only

## Implementation Approach

Create a new `executePendingActionsTool` Mastra tool that passes flattened fuse actions to the UI without doing server-side simulation. Create a new `ExecuteActions` React component that handles the entire multi-step flow client-side. Add a new case to `AlphaToolRenderer`. Update agent instructions to prefer the new tool for execution.

---

## Phase 1: New Mastra Tool — `executePendingActionsTool`

### Overview
A thin tool that takes pending actions from working memory and passes them to the UI component for client-side execution. No server-side simulation — the component handles everything.

### Changes Required:

#### 1. Add output type

**File**: `packages/mastra/src/tools/alpha/types.ts` (EDIT)

Add new type to the discriminated union:

```typescript
/** Passes pending actions to the UI for the full connect → role check → simulate → execute flow */
export type ExecuteActionsOutput = {
  type: 'execute-actions';
  vaultAddress: string;
  chainId: number;
  flatFuseActions: Array<{
    fuse: string;
    data: string;
  }>;
  actionsCount: number;
  fuseActionsCount: number;
  actionsSummary: string;
};
```

Add `ExecuteActionsOutput` to the `AlphaToolOutput` union.

#### 2. Create the tool

**File**: `packages/mastra/src/tools/alpha/execute-pending-actions.ts` (NEW)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const executePendingActionsTool = createTool({
  id: 'execute-pending-actions',
  description: `Execute pending fuse actions on a PlasmaVault. Passes actions to the UI for the full wallet flow: connect wallet → check ALPHA_ROLE → simulate → execute. Call this when the user asks to execute, run, send, or submit their pending actions.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('PlasmaVault contract address'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actions: z.array(z.object({
      id: z.string(),
      protocol: z.enum(['aave-v3', 'morpho', 'euler-v2']),
      actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
      description: z.string(),
      fuseActions: z.array(z.object({
        fuse: z.string(),
        data: z.string(),
      })),
    })).describe('The pending actions from working memory to execute'),
  }),
  outputSchema: z.object({
    type: z.literal('execute-actions'),
    vaultAddress: z.string(),
    chainId: z.number(),
    flatFuseActions: z.array(z.object({
      fuse: z.string(),
      data: z.string(),
    })),
    actionsCount: z.number(),
    fuseActionsCount: z.number(),
    actionsSummary: z.string(),
  }),
  execute: async ({ vaultAddress, chainId, actions }) => {
    const flatFuseActions = actions.flatMap(a => a.fuseActions);

    const actionsSummary = actions
      .map(a => `${a.actionType} on ${a.protocol}: ${a.description}`)
      .join('\n');

    return {
      type: 'execute-actions' as const,
      vaultAddress,
      chainId,
      flatFuseActions,
      actionsCount: actions.length,
      fuseActionsCount: flatFuseActions.length,
      actionsSummary,
    };
  },
});
```

#### 3. Export from barrel

**File**: `packages/mastra/src/tools/alpha/index.ts` (EDIT)

Add:
```typescript
export { executePendingActionsTool } from './execute-pending-actions';
```

Add `ExecuteActionsOutput` to the type exports.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`

---

## Phase 2: React Component — `ExecuteActions`

### Overview
Multi-step UI component that handles: connect wallet → switch chain → check ALPHA_ROLE → simulate (client-side) → execute → track confirmation.

### Changes Required:

#### 1. Create ExecuteActions component

**File**: `packages/web/src/vault-details/components/execute-actions.tsx` (NEW)

Inline minimal ABIs for `getAccessManagerAddress` and `hasRole` (same pattern as `simulation-result.tsx` which inlines the execute ABI).

**Hooks used:**
- `useAccount()` — connected address, chain, isConnected
- `useConnect()` — trigger wallet connection
- `useSwitchChain()` — switch to target chain
- `useReadContract()` — read AccessManager address from vault
- `useReadContract()` — check `hasRole(200n, connectedAddress)` on AccessManager
- `useSimulateContract()` — client-side simulation of `vault.execute(fuseActions)`
- `useWriteContract()` — send the actual transaction
- `useWaitForTransactionReceipt()` — track confirmation

**Component state machine:**

```
DISCONNECTED → WRONG_CHAIN → CHECKING_ROLE → NO_ROLE (error)
                                           → READY_TO_SIMULATE
                                           → SIMULATING → SIMULATION_FAILED (error)
                                                        → READY_TO_EXECUTE
                                                        → EXECUTING → CONFIRMING → CONFIRMED
```

**Implementation outline:**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Wallet, Loader2, ShieldCheck, ShieldX, Play, Zap,
} from 'lucide-react';
import {
  useAccount, useConnect, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import type { Address, Hex } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import type { ExecuteActionsOutput } from '@wgenie/fusion-mastra/alpha-types';

const ALPHA_ROLE_ID = 200n;

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [arbitrum.id]: 'Arbitrum',
  [base.id]: 'Base',
};

/** Minimal ABI: PlasmaVault.getAccessManagerAddress() */
const getAccessManagerAbi = [
  {
    type: 'function' as const,
    name: 'getAccessManagerAddress' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' as const }],
    stateMutability: 'view' as const,
  },
] as const;

/** Minimal ABI: AccessManager.hasRole(uint64, address) */
const hasRoleAbi = [
  {
    type: 'function' as const,
    name: 'hasRole' as const,
    inputs: [
      { name: 'roleId', type: 'uint64' as const },
      { name: 'account', type: 'address' as const },
    ],
    outputs: [
      { name: 'isMember', type: 'bool' as const },
      { name: 'executionDelay', type: 'uint32' as const },
    ],
    stateMutability: 'view' as const,
  },
] as const;

/** Minimal ABI: PlasmaVault.execute(FuseAction[]) */
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
  vaultAddress: ExecuteActionsOutput['vaultAddress'];
  chainId: ExecuteActionsOutput['chainId'];
  flatFuseActions: ExecuteActionsOutput['flatFuseActions'];
  actionsCount: ExecuteActionsOutput['actionsCount'];
  fuseActionsCount: ExecuteActionsOutput['fuseActionsCount'];
  actionsSummary: ExecuteActionsOutput['actionsSummary'];
}

export function ExecuteActions({
  vaultAddress, chainId, flatFuseActions,
  actionsCount, fuseActionsCount, actionsSummary,
}: Props) {
  // -- Wallet connection --
  const { isConnected, address, chain: walletChain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongChain = isConnected && walletChain?.id !== chainId;
  const isCorrectChain = isConnected && walletChain?.id === chainId;
  const targetChainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

  // -- ALPHA_ROLE check (two-step: get AccessManager → check hasRole) --
  const { data: accessManagerAddress, isLoading: isLoadingAM } = useReadContract({
    address: vaultAddress as Address,
    abi: getAccessManagerAbi,
    functionName: 'getAccessManagerAddress',
    chainId,
    query: { enabled: isCorrectChain },
  });

  const { data: roleResult, isLoading: isCheckingRole } = useReadContract({
    address: accessManagerAddress as Address,
    abi: hasRoleAbi,
    functionName: 'hasRole',
    args: [ALPHA_ROLE_ID, address!],
    chainId,
    query: { enabled: isCorrectChain && !!accessManagerAddress && !!address },
  });

  const hasAlphaRole = roleResult?.[0] === true;
  const roleChecked = isCorrectChain && !!roleResult;
  const isRoleLoading = isCorrectChain && (isLoadingAM || isCheckingRole);

  // -- Simulation (client-side) --
  const [simulationState, setSimulationState] = useState<
    'idle' | 'simulating' | 'success' | 'error'
  >('idle');
  const [simulationError, setSimulationError] = useState<string>();

  // -- Execute --
  const {
    writeContract, data: txHash,
    isPending: isWriting, error: writeError, reset: resetWrite,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const handleConnect = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const handleSimulate = useCallback(async () => {
    setSimulationState('simulating');
    setSimulationError(undefined);
    try {
      // Use wagmi's public client for simulation
      const { createPublicClient, http } = await import('viem');
      const chain = [mainnet, arbitrum, base].find(c => c.id === chainId);
      if (!chain) throw new Error(`Unsupported chain ${chainId}`);

      // Get RPC URL from wagmi config (same env vars)
      const rpcUrls: Record<number, string | undefined> = {
        [mainnet.id]: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
        [arbitrum.id]: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM,
        [base.id]: process.env.NEXT_PUBLIC_RPC_URL_BASE,
      };

      const client = createPublicClient({
        chain,
        transport: http(rpcUrls[chainId]),
      });

      await client.simulateContract({
        account: address,
        address: vaultAddress as Address,
        abi: plasmaVaultExecuteAbi,
        functionName: 'execute',
        args: [flatFuseActions.map(a => ({
          fuse: a.fuse as Address,
          data: a.data as Hex,
        }))],
      });

      setSimulationState('success');
    } catch (err) {
      setSimulationState('error');
      setSimulationError(err instanceof Error ? err.message : String(err));
    }
  }, [address, vaultAddress, chainId, flatFuseActions]);

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

  // -- Render --
  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <p className="text-sm font-medium">
          Execute {actionsCount} action{actionsCount === 1 ? '' : 's'} ({fuseActionsCount} fuse call{fuseActionsCount === 1 ? '' : 's'})
        </p>
      </div>

      {/* Actions summary */}
      <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{actionsSummary}</pre>

      {/* Step indicators + action area */}
      <div className="space-y-2">
        {/* === STEP 1: Connect Wallet === */}
        <StepRow
          number={1}
          label="Connect Wallet"
          status={isConnected ? 'done' : isConnecting ? 'loading' : 'pending'}
          detail={isConnected && address
            ? `${address.slice(0, 6)}...${address.slice(-4)}${walletChain ? ` on ${walletChain.name}` : ''}`
            : undefined
          }
        />
        {!isConnected && (
          <Button onClick={handleConnect} disabled={isConnecting} variant="outline" size="sm" className="w-full">
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
            Connect Wallet
          </Button>
        )}

        {/* === STEP 2: Switch Chain === */}
        {isConnected && (
          <>
            <StepRow
              number={2}
              label={`Switch to ${targetChainName}`}
              status={isCorrectChain ? 'done' : isSwitching ? 'loading' : 'pending'}
            />
            {isWrongChain && (
              <Button onClick={() => switchChain({ chainId })} disabled={isSwitching} variant="outline" size="sm" className="w-full">
                {isSwitching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Switch to {targetChainName}
              </Button>
            )}
          </>
        )}

        {/* === STEP 3: Check ALPHA_ROLE === */}
        {isCorrectChain && (
          <>
            <StepRow
              number={3}
              label="Check ALPHA_ROLE"
              status={
                isRoleLoading ? 'loading'
                : roleChecked && hasAlphaRole ? 'done'
                : roleChecked && !hasAlphaRole ? 'error'
                : 'pending'
              }
              detail={roleChecked && !hasAlphaRole ? 'Your wallet does not have ALPHA_ROLE on this vault' : undefined}
            />
          </>
        )}

        {/* === STEP 4: Simulate === */}
        {isCorrectChain && roleChecked && hasAlphaRole && (
          <>
            <StepRow
              number={4}
              label="Simulate Transaction"
              status={
                simulationState === 'simulating' ? 'loading'
                : simulationState === 'success' ? 'done'
                : simulationState === 'error' ? 'error'
                : 'pending'
              }
              detail={simulationError ? simulationError.slice(0, 200) : undefined}
            />
            {simulationState === 'idle' && (
              <Button onClick={handleSimulate} variant="outline" size="sm" className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Simulate Transaction
              </Button>
            )}
            {simulationState === 'error' && (
              <Button onClick={handleSimulate} variant="outline" size="sm" className="w-full">
                Retry Simulation
              </Button>
            )}
          </>
        )}

        {/* === STEP 5: Execute === */}
        {simulationState === 'success' && !isConfirmed && (
          <>
            <StepRow
              number={5}
              label="Execute Transaction"
              status={
                isWriting ? 'loading'
                : isConfirming ? 'loading'
                : txHash && isConfirmed ? 'done'
                : 'pending'
              }
              detail={
                isWriting ? 'Confirm in your wallet...'
                : isConfirming ? 'Waiting for on-chain confirmation...'
                : undefined
              }
            />
            {!txHash && (
              <Button onClick={handleExecute} disabled={isWriting} size="sm" className="w-full">
                {isWriting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Execute Transaction
              </Button>
            )}
          </>
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

        {/* Tx confirmed */}
        {isConfirmed && txHash && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Transaction confirmed!</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Helper: step indicator row */
function StepRow({ number, label, status, detail }: {
  number: number;
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {status === 'done' ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : status === 'loading' ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : status === 'error' ? (
        <XCircle className="w-4 h-4 text-destructive" />
      ) : (
        <span className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground">
          {number}
        </span>
      )}
      <span className={`text-sm ${status === 'done' ? 'text-green-500' : status === 'error' ? 'text-destructive' : 'text-foreground'}`}>
        {label}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          — {detail}
        </span>
      )}
    </div>
  );
}
```

**NOTE on simulation**: Instead of creating a new public client, we should use wagmi's `usePublicClient()` hook to get the existing configured client. This avoids duplicating RPC config. Updated approach:

```typescript
import { usePublicClient } from 'wagmi';
// ...
const publicClient = usePublicClient({ chainId });

const handleSimulate = useCallback(async () => {
  if (!publicClient || !address) return;
  setSimulationState('simulating');
  setSimulationError(undefined);
  try {
    await publicClient.simulateContract({
      account: address,
      address: vaultAddress as Address,
      abi: plasmaVaultExecuteAbi,
      functionName: 'execute',
      args: [flatFuseActions.map(a => ({
        fuse: a.fuse as Address,
        data: a.data as Hex,
      }))],
    });
    setSimulationState('success');
  } catch (err) {
    setSimulationState('error');
    setSimulationError(err instanceof Error ? err.message : String(err));
  }
}, [publicClient, address, vaultAddress, chainId, flatFuseActions]);
```

#### 2. Add case to AlphaToolRenderer

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx` (EDIT)

Add import and case:

```tsx
import { ExecuteActions } from './execute-actions';

// In switch:
case 'execute-actions':
  return (
    <ExecuteActions
      vaultAddress={typed.vaultAddress}
      chainId={typed.chainId}
      flatFuseActions={typed.flatFuseActions}
      actionsCount={typed.actionsCount}
      fuseActionsCount={typed.fuseActionsCount}
      actionsSummary={typed.actionsSummary}
    />
  );
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Web dev server starts: `pnpm dev:web`

---

## Phase 3: Wire Up Agent

### Overview
Register the new tool on the alpha agent and update instructions to prefer `executePendingActionsTool` for execution.

### Changes Required:

#### 1. Register tool on agent

**File**: `packages/mastra/src/agents/alpha-agent.ts` (EDIT)

Add import:
```typescript
import { executePendingActionsTool } from '../tools/alpha';
```

Add to tools object:
```typescript
tools: {
  // ... existing tools
  executePendingActionsTool,
},
```

#### 2. Update agent instructions

**File**: `packages/mastra/src/agents/alpha-agent.ts` (EDIT)

Update the SIMULATION & EXECUTION section in instructions:

```
## EXECUTION

When the user asks to execute, run, send, or submit their pending actions:

1. Call executePendingActionsTool with:
   - vaultAddress and chainId from the conversation context
   - actions from your working memory's pendingActions
2. The UI will guide the user through: connect wallet → check ALPHA_ROLE → simulate → execute.
3. You do NOT need to ask for the user's wallet address — the UI reads it from the connected wallet.
4. NEVER execute transactions yourself. The user must always manually approve in their wallet.

When the user asks to just simulate (without executing), use simulatePendingActionsTool as before — it still requires a callerAddress.
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] Mastra dev server starts: `pnpm dev:mastra`

#### Manual Verification:
- [ ] Ask agent to execute pending actions → triggers `executePendingActionsTool` (not `simulatePendingActionsTool`)
- [ ] `ExecuteActions` component renders in chat
- [ ] Full flow: connect wallet → switch chain → role check passes → simulate succeeds → execute → tx confirmed
- [ ] Role check failure shows clear error message
- [ ] Simulation failure shows error with retry button
- [ ] Tx rejection in wallet shows error with retry

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual testing.

---

## Testing Strategy

### Manual Testing Steps:
1. Start `pnpm dev:web` and `pnpm dev:mastra`
2. Go to vault ask-ai page for Base vault
3. Create pending actions (e.g., "supply 1000 USDC to Aave V3")
4. Ask agent to "execute my actions"
5. Test multi-step flow:
   - **Step 1**: Click "Connect Wallet" → MetaMask/Rabby popup
   - **Step 2**: If on wrong chain → click "Switch to Base" → chain switch prompt
   - **Step 3**: ALPHA_ROLE check auto-runs → shows check/error
   - **Step 4**: Click "Simulate Transaction" → client-side eth_call
   - **Step 5**: Click "Execute Transaction" → wallet popup → confirm → track tx
6. Test error cases:
   - Wallet without ALPHA_ROLE → clear error at step 3
   - Simulation failure (e.g., insufficient balance) → error at step 4 with retry
   - Reject tx in wallet → error at step 5 with retry
   - Reject wallet connection → stays at step 1
   - Reject chain switch → stays at step 2

## References

- AccessManager ABI: `packages/sdk/src/abi/access-manager.abi.ts:486` (`hasRole`)
- PlasmaVault ABI: `packages/sdk/src/abi/plasma-vault.abi.ts:778` (`getAccessManagerAddress`)
- ALPHA_ROLE value: `packages/sdk/src/access-manager/access-manager.types.ts:106` (200n)
- PlasmaVault SDK role check: `packages/sdk/src/PlasmaVault.ts:360-384`
- Existing simulation tool: `packages/mastra/src/tools/alpha/simulate-pending-actions.ts`
- Existing simulation component: `packages/web/src/vault-details/components/simulation-result.tsx`
- Alpha agent: `packages/mastra/src/agents/alpha-agent.ts`
- Tool renderer: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
- wagmi provider: `packages/web/src/app/wagmi-provider.tsx`
