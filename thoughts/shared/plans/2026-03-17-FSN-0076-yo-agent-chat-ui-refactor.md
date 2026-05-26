# FSN-0076: YO Agent Chat UI Refactor — Implementation Plan

## Overview

Consolidate the two agent chat UIs (Alpha + YO Treasury) into a shared component architecture. Move all tool display components into a single `packages/web/src/alpha/tools/` directory with per-tool subfolders containing the component + Storybook stories. Deduplicate Mastra schemas. Remove dead code (`TransactionsToSign`, `SimulationResult`).

## Current State Analysis

### Two nearly identical chat components
- `VaultAlpha` (`vault-details/components/vault-alpha.tsx:22`) and `TreasuryChat` (`yo-treasury/components/treasury-chat.tsx:21`) share ~95% code — same `useChat` hook, message rendering, input form. Only differ in API endpoint, tool renderer, body params, and placeholder text.

### Two tool renderers with overlapping tools
- `AlphaToolRenderer` — 6 cases: `transactions-to-sign`, `pending-actions`, `market-balances`, `action-with-simulation`, `simulation-result`, `execute-actions`
- `YoToolRenderer` — 5 cases: `yo-vaults`, `treasury-balances`, `action-with-simulation`, `pending-actions`, `execute-actions`
- 3 tool types shared: `action-with-simulation`, `pending-actions`, `execute-actions`

### Tool components scattered
- Alpha tools live in `vault-details/components/`
- YO tools live in `yo-treasury/components/`
- Shared components imported cross-directory

### Dead code
- `TransactionsToSign` — placeholder component, never useful
- `SimulationResult` — duplicates `ExecuteActions` inline execute flow; `simulation-result` type defined in alpha types but no tool returns it
- `SimulationResultOutput` — unused type

### Mastra duplication
- `pendingActionSchema` defined identically in both `yo-treasury-agent.ts:15` and `alpha-agent.ts:16` (same shape, different protocol enums)

### Key Discoveries
- `SimulationBalanceComparison` is a sub-component of both `ActionWithSimulation` and `SimulationResult` — after removing `SimulationResult`, it only serves `ActionWithSimulation`
- Both agents already share `displayPendingActionsTool` and `executePendingActionsTool` from `tools/alpha/`
- Only 2 of ~10 tool components have Storybook stories

## Desired End State

```
packages/web/src/alpha/
  agent-chat.tsx                              # Unified chat component (fixed 600px height)
  tools/
    tool-renderer.tsx                         # Unified tool renderer (all tool types)
    yo-vaults/
      yo-vaults-list.tsx
      yo-vaults-list.stories.tsx
    treasury-balances/
      treasury-balances.tsx
      treasury-balances.stories.tsx
    market-balances/
      market-balances-list.tsx
      market-balances-list.stories.tsx
    action-with-simulation/
      action-with-simulation.tsx
      simulation-balance-comparison.tsx        # Sub-component, kept alongside
      action-with-simulation.stories.tsx
    pending-actions/
      pending-actions-list.tsx
      pending-actions-list.stories.tsx
    execute-actions/
      execute-actions.tsx
      execute-actions.stories.tsx

packages/mastra/src/tools/shared/
  pending-action-schema.ts                    # Shared schema, parameterized protocol enum
```

### Verification
- `pnpm --filter @wgenie/fusion-web typecheck` passes
- `pnpm --filter @wgenie/fusion-web storybook build` passes
- All stories render correctly in Storybook (port 6007)
- Both chats work: `/vaults/8453/0xa13.../alpha` and `/vaults/8453/0x09d.../` (YO treasury tab)
- No files remain in old locations (`vault-details/components/` for tool components, `yo-treasury/components/` for tool components)

## What We're NOT Doing

- NOT restructuring Mastra tool directories (tools/alpha, tools/yo-treasury stay as-is)
- NOT changing API routes or Mastra agent definitions (beyond schema dedup)
- NOT changing tool output type discriminators (the `type` strings stay the same)
- NOT changing the chat API transport or message protocol
- NOT adding new tools or removing existing functional tools
- NOT touching the deposit/withdraw forms in yo-treasury

## Implementation Approach

Bottom-up: move components first (no consumer changes), then create the new chat + renderer, then rewire consumers, then delete old files. Each phase is independently testable.

---

## Phase 1: Create shared tools directory & move components

### Overview
Create the `packages/web/src/alpha/tools/` directory structure and move all tool components into their subfolders. No consumer changes yet — old files still exist (we'll update imports in Phase 3).

### Changes Required:

#### 1. Create directory structure

Create these directories:
- `packages/web/src/alpha/tools/yo-vaults/`
- `packages/web/src/alpha/tools/treasury-balances/`
- `packages/web/src/alpha/tools/market-balances/`
- `packages/web/src/alpha/tools/action-with-simulation/`
- `packages/web/src/alpha/tools/pending-actions/`
- `packages/web/src/alpha/tools/execute-actions/`

#### 2. Move components

| Source | Destination |
|--------|------------|
| `yo-treasury/components/yo-vaults-list.tsx` | `alpha/tools/yo-vaults/yo-vaults-list.tsx` |
| `yo-treasury/components/treasury-balances.tsx` | `alpha/tools/treasury-balances/treasury-balances.tsx` |
| `vault-details/components/market-balances-list.tsx` | `alpha/tools/market-balances/market-balances-list.tsx` |
| `vault-details/components/action-with-simulation.tsx` | `alpha/tools/action-with-simulation/action-with-simulation.tsx` |
| `vault-details/components/simulation-balance-comparison.tsx` | `alpha/tools/action-with-simulation/simulation-balance-comparison.tsx` |
| `vault-details/components/pending-actions-list.tsx` | `alpha/tools/pending-actions/pending-actions-list.tsx` |
| `vault-details/components/execute-actions.tsx` | `alpha/tools/execute-actions/execute-actions.tsx` |

#### 3. Fix relative imports in moved files

After moving, update any relative imports within these files (e.g., `./simulation-balance-comparison` stays valid since it moves alongside, but imports to `@/components/ui/...` and `@wgenie/fusion-mastra/...` stay the same since they use aliases).

Cross-component imports to fix:
- `action-with-simulation.tsx` imports `./simulation-balance-comparison` → stays valid (same subfolder)
- `simulation-balance-comparison.tsx` — no cross-tool imports
- No other cross-tool imports exist

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes (old files still exist as re-exports or we skip this until Phase 3)

#### Manual Verification:
- [ ] New files exist in correct locations
- [ ] File contents are correct (no broken imports)

**Implementation Note**: After completing this phase, pause for manual confirmation before proceeding.

---

## Phase 2: Create Storybook stories for each tool

### Overview
Create comprehensive Storybook stories for each tool component. Stories serve as documentation — each story file explains the tool's purpose, shows success/error/empty states with realistic mock data.

### Changes Required:

#### 1. `alpha/tools/yo-vaults/yo-vaults-list.stories.tsx`

Stories:
- **Default** — 4 YO vaults on Base with realistic APY, TVL, user positions
- **NoPositions** — vaults without user positions (all balance/value null)
- **Error** — `success: false` with error message
- **SingleVault** — just yoUSD

Document: "Displays available YO Protocol vaults with APY, TVL, and the user's current position (shares, underlying amount, USD value). Shown when the agent calls `getYoVaultsTool`."

#### 2. `alpha/tools/treasury-balances/treasury-balances.stories.tsx`

Stories:
- **Default** — 2 unallocated tokens + 3 YO positions
- **UnallocatedOnly** — tokens but no YO positions
- **AllocatedOnly** — no unallocated tokens, only YO positions
- **Error** — `success: false`

Document: "Shows the treasury vault's current holdings: unallocated ERC20 tokens and allocated YO vault positions. Shown when the agent calls `getTreasuryAllocationTool`."

#### 3. `alpha/tools/market-balances/market-balances-list.stories.tsx`

Stories:
- **Default** — 2 unallocated assets + 2 market allocations (Aave V3, Morpho) with supply/borrow positions
- **SupplyOnly** — markets with only supply positions (no borrows)
- **WithBorrows** — markets showing both supply and borrow
- **EmptyVault** — no assets, no markets

Document: "Displays the Plasma Vault's unallocated ERC20 tokens and allocated DeFi market positions (Aave V3, Morpho, Euler V2). Shown when the agent calls `getMarketBalancesTool`."

#### 4. `alpha/tools/action-with-simulation/action-with-simulation.stories.tsx`

Stories:
- **SuccessWithSimulation** — successful action + successful simulation with balance changes
- **SuccessNoSimulation** — action created but no simulation data
- **ActionFailed** — `success: false` with error
- **SimulationFailed** — action succeeded but simulation failed

Document: "Shows the result of creating a fuse action (supply, withdraw, swap, borrow, repay) with optional simulation results showing before/after balance changes. Shown after any action creation tool call."

#### 5. `alpha/tools/pending-actions/pending-actions-list.stories.tsx`

Stories:
- **WithActions** — 3 pending actions (supply Aave, withdraw Morpho, swap YO)
- **Empty** — no pending actions
- **SingleAction** — one action

Document: "Displays the queue of pending fuse actions awaiting execution. Each action shows protocol, type, description, and expandable raw payload. Shown when the agent calls `displayPendingActionsTool`."

#### 6. `alpha/tools/execute-actions/execute-actions.stories.tsx`

Existing stories at `vault-details/components/execute-actions.stories.tsx` — move and expand:
- **SupplyUsdcAaveV3** — existing story (1 action)
- **MultipleActions** — existing story (2 actions)
- **YoAllocation** — YO vault allocation action

Document: "5-step execution wizard: connect wallet → switch chain → check ALPHA_ROLE → simulate → execute. Renders when the agent calls `executePendingActionsTool`. Auto-skips client simulation since the agent already simulated on an Anvil fork."

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web storybook build` passes

#### Manual Verification:
- [ ] All stories render correctly in Storybook (port 6007)
- [ ] Stories document each tool's purpose clearly
- [ ] Mock data is realistic (real token addresses, reasonable amounts)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual Storybook review.

---

## Phase 3: Create unified AgentChat component & tool renderer

### Overview
Create a single `AgentChat` component that replaces both `VaultAlpha` and `TreasuryChat`. Fixed 600px height. Tool renderer passed as prop. Also create a unified `ToolRenderer` that handles all tool types.

### Changes Required:

#### 1. `packages/web/src/alpha/agent-chat.tsx`

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, type ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SendHorizontal, Bot, User } from 'lucide-react';

export interface ToolPartProps {
  state: string;
  output?: unknown;
  chainId: number;
}

interface AgentChatProps {
  apiEndpoint: string;
  body?: Record<string, unknown>;
  chainId: number;
  toolRenderer: ComponentType<ToolPartProps>;
  emptyStateText?: string;
  placeholder?: string;
  className?: string;
}

export function AgentChat({
  apiEndpoint,
  body,
  chainId,
  toolRenderer: ToolRenderer,
  emptyStateText = 'Ask anything...',
  placeholder = 'Type a message...',
  className,
}: AgentChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: apiEndpoint,
      body,
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue('');
  };

  return (
    <Card className={cn('flex flex-col h-[600px]', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Bot className="w-8 h-8" />
            <p>{emptyStateText}</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 text-sm',
              message.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="max-w-[80%] space-y-2">
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  if (!part.text) return null;
                  return (
                    <div
                      key={index}
                      className={cn(
                        'rounded-lg px-3 py-2 whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                      )}
                    >
                      {part.text}
                    </div>
                  );
                }

                if (part.type.startsWith('tool-')) {
                  return (
                    <ToolRenderer
                      key={index}
                      state={(part as { state: string }).state}
                      output={
                        'output' in part
                          ? (part as { output: unknown }).output
                          : undefined
                      }
                      chainId={chainId}
                    />
                  );
                }

                return null;
              })}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleFormSubmit} className="border-t p-4 flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !inputValue.trim()}
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
```

Key changes vs old components:
- Fixed `h-[600px]` — no `useLayoutEffect`/`useCallback`/resize listener
- `toolRenderer` as prop (capitalized for JSX usage)
- `apiEndpoint` + `body` instead of hardcoded transport
- `emptyStateText` + `placeholder` for customization
- Exports `ToolPartProps` interface for renderer implementations

#### 2. `packages/web/src/alpha/tools/tool-renderer.tsx`

Unified renderer handling all tool types from both agents:

```tsx
import { Loader2 } from 'lucide-react';
import { YoVaultsList } from './yo-vaults/yo-vaults-list';
import { TreasuryBalances } from './treasury-balances/treasury-balances';
import { MarketBalancesList } from './market-balances/market-balances-list';
import { ActionWithSimulation } from './action-with-simulation/action-with-simulation';
import { PendingActionsList } from './pending-actions/pending-actions-list';
import { ExecuteActions } from './execute-actions/execute-actions';
import type { ToolPartProps } from '../agent-chat';
import type { YoVaultsOutput, TreasuryBalancesOutput } from '@wgenie/fusion-mastra/yo-treasury-types';
import type { ActionWithSimulationOutput, PendingActionsOutput, ExecuteActionsOutput, MarketBalancesOutput } from '@wgenie/fusion-mastra/alpha-types';

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
    // YO Treasury tools
    case 'yo-vaults':
      return <YoVaultsList output={typed as YoVaultsOutput} chainId={chainId} />;
    case 'treasury-balances':
      return <TreasuryBalances output={typed as TreasuryBalancesOutput} chainId={chainId} />;

    // Alpha tools
    case 'market-balances': {
      const mb = typed as MarketBalancesOutput;
      return (
        <MarketBalancesList
          assets={mb.assets}
          markets={mb.markets}
          totalValueUsd={mb.totalValueUsd}
          message={mb.message}
          chainId={chainId}
        />
      );
    }

    // Shared tools
    case 'action-with-simulation': {
      const action = typed as ActionWithSimulationOutput;
      return (
        <ActionWithSimulation
          success={action.success}
          protocol={action.protocol}
          actionType={action.actionType}
          description={action.description}
          error={action.error}
          simulation={action.simulation}
          chainId={chainId}
        />
      );
    }
    case 'pending-actions': {
      const pending = typed as PendingActionsOutput;
      return (
        <PendingActionsList
          actions={pending.actions}
          message={pending.message}
        />
      );
    }
    case 'execute-actions': {
      const exec = typed as ExecuteActionsOutput;
      return (
        <ExecuteActions
          vaultAddress={exec.vaultAddress}
          chainId={exec.chainId}
          flatFuseActions={exec.flatFuseActions}
          actionsCount={exec.actionsCount}
          fuseActionsCount={exec.fuseActionsCount}
          actionsSummary={exec.actionsSummary}
        />
      );
    }

    default:
      return null;
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes

#### Manual Verification:
- [ ] `AgentChat` component renders correctly with fixed 600px height
- [ ] Tool renderer handles all tool types from both agents

**Implementation Note**: Pause here for confirmation before rewiring consumers.

---

## Phase 4: Rewire consumers to use new components

### Overview
Update the alpha page and yo-treasury page/tab to use `AgentChat` + `ToolRenderer` from the new shared location. Remove old chat components and renderers.

### Changes Required:

#### 1. Update alpha page

**File**: `packages/web/src/app/vaults/[chainId]/[address]/alpha/page.tsx`

Change from importing `VaultAlpha` to importing `AgentChat` + `ToolRenderer`:

```tsx
import { AgentChat } from '@/alpha/agent-chat';
import { ToolRenderer } from '@/alpha/tools/tool-renderer';

// In the component:
<AgentChat
  apiEndpoint={`/api/vaults/${chainId}/${vaultAddress}/chat`}
  body={walletAddress ? { callerAddress: walletAddress } : undefined}
  chainId={chainId}
  toolRenderer={ToolRenderer}
  emptyStateText="Ask anything about this vault"
  placeholder="Ask about this vault..."
/>
```

Note: `walletAddress` from `useAccount()` needs to move to the page component (or a wrapper). Currently `VaultAlpha` calls `useAccount()` internally. The page component will need to become a client component or use a wrapper.

#### 2. Update yo-treasury consumer

Find where `TreasuryChat` is used and replace with `AgentChat`:

```tsx
import { AgentChat } from '@/alpha/agent-chat';
import { ToolRenderer } from '@/alpha/tools/tool-renderer';

<AgentChat
  apiEndpoint="/api/yo/treasury/chat"
  body={{ callerAddress, vaultAddress, chainId }}
  chainId={chainId}
  toolRenderer={ToolRenderer}
  emptyStateText="Ask about YO vaults or manage your treasury"
  placeholder="Ask about YO vaults or manage your treasury..."
/>
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes

#### Manual Verification:
- [ ] Alpha chat works at `/vaults/8453/0xa13f7342.../alpha`
- [ ] YO treasury chat works at `/vaults/8453/0x09d1C2E0.../` (chat tab)
- [ ] Both chats render tool outputs correctly
- [ ] Fixed 600px height on both chats

**Implementation Note**: Pause here — test both chat UIs manually before cleanup.

---

## Phase 5: Delete old files & dead code

### Overview
Remove all old component files, old renderers, dead components (`TransactionsToSign`, `SimulationResult`), and the unused `SimulationResultOutput` type.

### Files to delete:

#### Old chat components
- `packages/web/src/vault-details/components/vault-alpha.tsx`
- `packages/web/src/vault-details/components/vault-alpha.stories.tsx`
- `packages/web/src/yo-treasury/components/treasury-chat.tsx`

#### Old tool renderers
- `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
- `packages/web/src/yo-treasury/components/yo-tool-renderer.tsx`

#### Old tool component locations (now in `alpha/tools/`)
- `packages/web/src/vault-details/components/action-with-simulation.tsx`
- `packages/web/src/vault-details/components/simulation-balance-comparison.tsx`
- `packages/web/src/vault-details/components/pending-actions-list.tsx`
- `packages/web/src/vault-details/components/execute-actions.tsx`
- `packages/web/src/vault-details/components/execute-actions.stories.tsx`
- `packages/web/src/vault-details/components/market-balances-list.tsx`
- `packages/web/src/yo-treasury/components/yo-vaults-list.tsx`
- `packages/web/src/yo-treasury/components/treasury-balances.tsx`

#### Dead code to remove
- `packages/web/src/vault-details/components/transactions-to-sign.tsx`
- `packages/web/src/vault-details/components/simulation-result.tsx`

#### Type cleanup
- Remove `TransactionsToSignOutput` from `packages/mastra/src/tools/alpha/types.ts`
- Remove `SimulationResultOutput` from `packages/mastra/src/tools/alpha/types.ts`
- Remove both from `AlphaToolOutput` union type
- Remove `displayTransactionsTool` export from `packages/mastra/src/tools/alpha/index.ts` if it exists and is unused

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-web typecheck` passes
- [ ] `pnpm --filter @wgenie/fusion-mastra typecheck` passes (if applicable)
- [ ] No imports reference deleted files: `grep -r "transactions-to-sign\|simulation-result\|vault-alpha\|treasury-chat\|alpha-tool-renderer\|yo-tool-renderer" packages/web/src/`

#### Manual Verification:
- [ ] Both chats still work after cleanup
- [ ] No console errors

---

## Phase 6: Mastra schema deduplication

### Overview
Extract the shared `pendingActionSchema` from both agent files into a shared location. Parameterize the `protocol` enum since alpha uses `['aave-v3', 'morpho', 'euler-v2']` and yo-treasury uses `['yo-erc4626', 'yo-swap']`.

### Changes Required:

#### 1. Create shared schema

**File**: `packages/mastra/src/tools/shared/pending-action-schema.ts`

```ts
import { z } from 'zod';

/**
 * Creates a pending action schema with the given protocol enum values.
 * Shared between Alpha and YO Treasury agents.
 */
export function createPendingActionSchema<T extends [string, ...string[]]>(protocols: T) {
  return z.object({
    id: z.string().describe('Unique ID, e.g. "1", "2"'),
    protocol: z.enum(protocols).describe('Protocol name'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay', 'swap']).describe('Action type'),
    description: z.string().describe('Human-readable description'),
    fuseActions: z.array(z.object({
      fuse: z.string().describe('Fuse contract address'),
      data: z.string().describe('Hex-encoded calldata'),
    })),
  });
}

export function createWorkingMemorySchema<T extends [string, ...string[]]>(protocols: T) {
  return z.object({
    pendingActions: z.array(createPendingActionSchema(protocols)).optional().describe(
      'List of pending fuse actions to execute as a batch'
    ),
  });
}
```

#### 2. Update alpha-agent.ts

**File**: `packages/mastra/src/agents/alpha-agent.ts`

Replace inline schemas:
```ts
import { createWorkingMemorySchema, createPendingActionSchema } from '../tools/shared/pending-action-schema';

const pendingActionSchema = createPendingActionSchema(['aave-v3', 'morpho', 'euler-v2']);
export const alphaWorkingMemorySchema = createWorkingMemorySchema(['aave-v3', 'morpho', 'euler-v2']);
export type PendingAction = z.infer<typeof pendingActionSchema>;
```

#### 3. Update yo-treasury-agent.ts

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts`

```ts
import { createWorkingMemorySchema } from '../tools/shared/pending-action-schema';

export const yoTreasuryWorkingMemorySchema = createWorkingMemorySchema(['yo-erc4626', 'yo-swap']);
```

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm --filter @wgenie/fusion-mastra typecheck` passes (if applicable)
- [ ] Both agents still function correctly (working memory reads/writes)

#### Manual Verification:
- [ ] Alpha agent chat works — create action, display pending, execute
- [ ] YO treasury agent chat works — create allocation, display pending, execute

---

## Testing Strategy

### Storybook (primary for tool components)
- All 6 tool components have stories with multiple variants
- Run Storybook on port 6007: `pnpm --filter @wgenie/fusion-web storybook dev`
- Each story documents the tool's purpose and shows realistic data

### Manual E2E
1. Alpha chat: navigate to `/vaults/8453/0xa13f7342.../alpha`, ask about balances, create an action, view pending, execute
2. YO treasury chat: navigate to YO vault page, use chat tab, ask about vaults, create allocation, execute
3. Verify tool outputs render identically to before the refactor

### Type checking
- `pnpm --filter @wgenie/fusion-web typecheck`
- `pnpm --filter @wgenie/fusion-mastra typecheck`

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0076-yo-agent-chat-ui-refactor.md`
- Alpha agent: `packages/mastra/src/agents/alpha-agent.ts`
- YO Treasury agent: `packages/mastra/src/agents/yo-treasury-agent.ts`
- Alpha types: `packages/mastra/src/tools/alpha/types.ts`
- YO Treasury types: `packages/mastra/src/tools/yo-treasury/types.ts`
