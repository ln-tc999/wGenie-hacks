# FSN-0034: Alpha Agent Memory — SDK Actions & Pending Actions List

## Overview

Add working memory to the Alpha Agent so it can use the SDK market classes (`AaveV3`, `Morpho`, `EulerV2`) to create `FuseAction[]` arrays and maintain a persistent list of pending actions. Display the pending actions list via a custom React component in the web app. Do NOT implement transaction execution — only build and display the list.

**Depends on**: FSN-0033 (discriminated output types, `AlphaToolRenderer`, `chatRoute()`)

## Current State Analysis

- **Alpha agent** exists at `packages/mastra/src/agents/alpha-agent.ts` with basic `Memory` (LibSQLStore) but **working memory is NOT enabled**
- **SDK** already a workspace dependency: `"@wgenie/fusion-sdk": "workspace:*"` in mastra's package.json
- **SDK market classes** (`AaveV3`, `Morpho`, `EulerV2`) produce `FuseAction[]` via `supply()`, `withdraw()`, `borrow()`, `repay()` methods
- **PlasmaVault.create()** requires RPC calls — existing `getPublicClient()` utility at `packages/mastra/src/tools/plasma-vault/utils/viem-clients.ts` handles this with caching
- **displayTransactionsTool** returns static `{ type: 'transactions-to-sign', message, placeholder }` — needs replacement with real pending actions
- **FSN-0033** (not yet implemented) will establish: discriminated union types (`AlphaToolOutput`), `AlphaToolRenderer` component, `chatRoute()`, and `./alpha-types` package export

### Key Discoveries:

- `FuseAction = { fuse: Address, data: Hex }` — compact structure, ~200 char hex strings (`packages/sdk/src/fusion.types.ts:14-19`)
- Market classes need `PlasmaVault` instance but only use `chainId` for fuse address lookup (`packages/sdk/src/markets/aave-v3/AaveV3.ts:24-27`)
- AaveV3 supply/withdraw take `(assetAddress, amount)`, Morpho takes `(morphoMarketId, amount)`, EulerV2 takes `(eulerVault, amount, subAccount?)`
- Mastra working memory supports Zod schemas with merge semantics; arrays replaced entirely on update (`@mastra/memory` docs section 04)
- The agent manages working memory updates via LLM output — no separate management tools needed per Mastra docs
- Existing `getPublicClient()` caches clients per chainId, supports Ethereum/Arbitrum/Base (`packages/mastra/src/tools/plasma-vault/utils/viem-clients.ts:36-67`)

## Desired End State

1. **Working memory** enabled on Alpha Agent with a Zod schema for `pendingActions` array
2. **SDK action tools** that create `FuseAction[]` using market classes and return structured results
3. **Agent stores actions** in working memory automatically (LLM-managed via instructions)
4. **Display tool** outputs the pending actions list for custom UI rendering
5. **Frontend component** shows human-readable action list with discreet "copy raw payload" option
6. **Extensible**: Adding a new protocol is: create market class → add tool → agent can use it

### Verification:
- Navigate to `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai`
- Tell agent: "Supply 1000 USDC to Aave V3" → agent calls SDK tool, stores action in memory
- Tell agent: "Show my pending actions" → agent calls display tool → custom component renders with action details
- Refresh page, same thread → agent still knows about the pending action from working memory
- In Mastra Studio: same flow, JSON output visible with `type: 'pending-actions'` discriminator

## What We're NOT Doing

- Executing transactions — only building the action list
- Real token/amount validation (the agent passes user input to SDK, SDK encodes it)
- Automatic vault detection — tools require explicit `vaultAddress` + `chainId` params
- Price lookups or balance checks for the actions
- Removing the existing `displayTransactionsTool` — it evolves into `displayPendingActionsTool`
- Adding new chains beyond Ethereum/Arbitrum/Base (current `getPublicClient` support)

## Implementation Approach

1. Enable working memory with schema on Alpha Agent
2. Create one tool per SDK protocol that creates FuseActions and returns structured results
3. The agent stores results in working memory via its built-in `updateWorkingMemory` mechanism
4. A display tool outputs the pending actions list with the FSN-0033 discriminated type pattern
5. Frontend renders a new `PendingActionsList` component, dispatched via `AlphaToolRenderer`

---

## Phase 1: Enable Working Memory on Alpha Agent

### Overview
Configure working memory with a Zod schema on the Alpha Agent. This gives the agent a persistent, structured "scratchpad" for pending actions that survives across messages and page refreshes.

### Changes Required:

#### 1. Update alpha agent memory configuration

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Add `workingMemory` option with schema to the Memory constructor

```typescript
import { Agent } from '@mastra/core/agent';
import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { z } from 'zod';
import { env } from '../env';
import { displayTransactionsTool } from '../tools/alpha';

/** Schema for a single pending action stored in working memory */
const pendingActionSchema = z.object({
  id: z.string().describe('Unique ID for this action, e.g. "1", "2"'),
  protocol: z.enum(['aave-v3', 'morpho', 'euler-v2']).describe('Protocol name'),
  actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']).describe('Action type'),
  description: z.string().describe('Human-readable description, e.g. "Supply 1000 USDC to Aave V3"'),
  fuseActions: z.array(z.object({
    fuse: z.string().describe('Fuse contract address'),
    data: z.string().describe('Hex-encoded calldata'),
  })).describe('Raw FuseAction data from SDK'),
});

/** Working memory schema for the Alpha Agent */
export const alphaWorkingMemorySchema = z.object({
  pendingActions: z.array(pendingActionSchema).optional().describe(
    'List of pending fuse actions to execute as a batch. The agent maintains this list.'
  ),
});

export type PendingAction = z.infer<typeof pendingActionSchema>;

const memory = new Memory({
  storage: new LibSQLStore({
    id: 'alpha-agent-memory',
    url: 'file:./mastra.db',
  }),
  options: {
    workingMemory: {
      enabled: true,
      schema: alphaWorkingMemorySchema,
    },
  },
});

export const alphaAgent = new Agent({
  id: 'alpha-agent',
  name: 'Alpha Agent',
  instructions: `You are an Alpha Agent for wGenie Fusion Plasma Vaults.
...`, // Full instructions in Phase 5
  model: env.MODEL,
  tools: {
    displayTransactionsTool,
  },
  memory,
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] `cd packages/mastra && pnpm dev` starts without errors

#### Manual Verification:
- [ ] Alpha agent visible in Mastra Studio
- [ ] Send a message → agent responds and working memory is initialized (empty `pendingActions`)
- [ ] Send another message in same thread → working memory persists

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Create SDK Action Tools

### Overview
Create one Mastra tool per protocol that uses the SDK market classes to produce `FuseAction[]` arrays. Each tool accepts `vaultAddress`, `chainId`, action type, and protocol-specific parameters. Tools use the existing `getPublicClient()` utility for RPC access and `PlasmaVault.create()` to instantiate the vault.

### Changes Required:

#### 1. Create Aave V3 action tool

**File**: `packages/mastra/src/tools/alpha/create-aave-v3-action.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address } from 'viem';
import { PlasmaVault, AaveV3 } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';

export const createAaveV3ActionTool = createTool({
  id: 'create-aave-v3-action',
  description: `Create an Aave V3 fuse action (supply, withdraw, borrow, or repay).
Returns the encoded FuseAction data to add to pending actions.
Requires vault address, chain ID, asset address, amount, and action type.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']).describe('Action to perform'),
    assetAddress: z.string().describe('ERC20 token address to supply/withdraw/borrow/repay'),
    amount: z.string().describe('Amount in the token\'s smallest unit (e.g. "1000000000" for 1000 USDC with 6 decimals)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    protocol: z.literal('aave-v3'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
    description: z.string(),
    fuseActions: z.array(z.object({
      fuse: z.string(),
      data: z.string(),
    })),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId, actionType, assetAddress, amount }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );
      const aaveV3 = new AaveV3(plasmaVault);
      const amountBigInt = BigInt(amount);

      let fuseActions;
      switch (actionType) {
        case 'supply':
          fuseActions = aaveV3.supply(assetAddress as Address, amountBigInt);
          break;
        case 'withdraw':
          fuseActions = aaveV3.withdraw(assetAddress as Address, amountBigInt);
          break;
        case 'borrow':
          fuseActions = aaveV3.borrow(assetAddress as Address, amountBigInt);
          break;
        case 'repay':
          fuseActions = aaveV3.repay(assetAddress as Address, amountBigInt);
          break;
      }

      return {
        success: true,
        protocol: 'aave-v3' as const,
        actionType,
        description: `Aave V3 ${actionType} ${amount} of asset ${assetAddress}`,
        fuseActions: fuseActions.map(a => ({ fuse: a.fuse, data: a.data })),
      };
    } catch (error) {
      return {
        success: false,
        protocol: 'aave-v3' as const,
        actionType,
        description: `Failed: Aave V3 ${actionType}`,
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 2. Create Morpho action tool

**File**: `packages/mastra/src/tools/alpha/create-morpho-action.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { PlasmaVault, Morpho } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';

export const createMorphoActionTool = createTool({
  id: 'create-morpho-action',
  description: `Create a Morpho fuse action (supply, withdraw, borrow, or repay).
Returns the encoded FuseAction data to add to pending actions.
Requires vault address, chain ID, Morpho market ID (bytes32 hex), amount, and action type.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']).describe('Action to perform'),
    morphoMarketId: z.string().describe('Morpho Blue market ID (bytes32 hex string starting with 0x)'),
    amount: z.string().describe('Amount in the token\'s smallest unit'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    protocol: z.literal('morpho'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
    description: z.string(),
    fuseActions: z.array(z.object({
      fuse: z.string(),
      data: z.string(),
    })),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId, actionType, morphoMarketId, amount }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );
      const morpho = new Morpho(plasmaVault);
      const amountBigInt = BigInt(amount);

      let fuseActions;
      switch (actionType) {
        case 'supply':
          fuseActions = morpho.supply(morphoMarketId as Hex, amountBigInt);
          break;
        case 'withdraw':
          fuseActions = morpho.withdraw(morphoMarketId as Hex, amountBigInt);
          break;
        case 'borrow':
          fuseActions = morpho.borrow(morphoMarketId as Hex, amountBigInt);
          break;
        case 'repay':
          fuseActions = morpho.repay(morphoMarketId as Hex, amountBigInt);
          break;
      }

      return {
        success: true,
        protocol: 'morpho' as const,
        actionType,
        description: `Morpho ${actionType} ${amount} in market ${morphoMarketId.slice(0, 10)}...`,
        fuseActions: fuseActions.map(a => ({ fuse: a.fuse, data: a.data })),
      };
    } catch (error) {
      return {
        success: false,
        protocol: 'morpho' as const,
        actionType,
        description: `Failed: Morpho ${actionType}`,
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 3. Create Euler V2 action tool

**File**: `packages/mastra/src/tools/alpha/create-euler-v2-action.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { PlasmaVault, EulerV2 } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';

export const createEulerV2ActionTool = createTool({
  id: 'create-euler-v2-action',
  description: `Create an Euler V2 fuse action (supply or withdraw).
Returns the encoded FuseAction data to add to pending actions.
Requires vault address, chain ID, Euler vault address, amount, and action type.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
    actionType: z.enum(['supply', 'withdraw']).describe('Action to perform'),
    eulerVault: z.string().describe('Euler V2 vault address to supply to / withdraw from'),
    amount: z.string().describe('Amount in the token\'s smallest unit'),
    subAccount: z.string().optional().describe('Euler sub-account byte (default 0x00)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    protocol: z.literal('euler-v2'),
    actionType: z.enum(['supply', 'withdraw']),
    description: z.string(),
    fuseActions: z.array(z.object({
      fuse: z.string(),
      data: z.string(),
    })),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId, actionType, eulerVault, amount, subAccount }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );
      const euler = new EulerV2(plasmaVault);
      const amountBigInt = BigInt(amount);
      const sub = (subAccount ?? '0x00') as Hex;

      let fuseActions;
      switch (actionType) {
        case 'supply':
          fuseActions = euler.supply(eulerVault as Address, amountBigInt, sub);
          break;
        case 'withdraw':
          fuseActions = euler.withdraw(eulerVault as Address, amountBigInt, sub);
          break;
      }

      return {
        success: true,
        protocol: 'euler-v2' as const,
        actionType,
        description: `Euler V2 ${actionType} ${amount} in vault ${eulerVault.slice(0, 10)}...`,
        fuseActions: fuseActions.map(a => ({ fuse: a.fuse, data: a.data })),
      };
    } catch (error) {
      return {
        success: false,
        protocol: 'euler-v2' as const,
        actionType,
        description: `Failed: Euler V2 ${actionType}`,
        fuseActions: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 4. Export new tools from alpha index

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Add exports for new tools

```typescript
export { displayTransactionsTool } from './display-transactions';
export { createAaveV3ActionTool } from './create-aave-v3-action';
export { createMorphoActionTool } from './create-morpho-action';
export { createEulerV2ActionTool } from './create-euler-v2-action';
export type { AlphaToolOutput, TransactionsToSignOutput, PendingActionsOutput } from './types';
```

#### 5. Register tools on alpha agent

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Import and add new tools to the agent's tools object

```typescript
import { createAaveV3ActionTool } from '../tools/alpha/create-aave-v3-action';
import { createMorphoActionTool } from '../tools/alpha/create-morpho-action';
import { createEulerV2ActionTool } from '../tools/alpha/create-euler-v2-action';
// ...

export const alphaAgent = new Agent({
  // ...
  tools: {
    displayPendingActionsTool, // updated in Phase 3
    createAaveV3ActionTool,
    createMorphoActionTool,
    createEulerV2ActionTool,
  },
  memory,
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] `cd packages/mastra && pnpm dev` starts — three new tools visible in Studio

#### Manual Verification:
- [ ] In Studio: Call `createAaveV3ActionTool` directly with test params → returns FuseAction data
- [ ] In Studio: Ask agent "supply 1000000000 of asset 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 to Aave V3 on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 on chain 1" → agent calls tool and returns result

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Display Pending Actions Tool & Type System

### Overview
Replace the placeholder `displayTransactionsTool` with `displayPendingActionsTool` that accepts the pending actions list and returns structured output for the UI. Extend the FSN-0033 discriminated union with the new `PendingActionsOutput` type.

### Changes Required:

#### 1. Update alpha output types (extends FSN-0033's type system)

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Add `PendingActionsOutput` to the discriminated union

```typescript
/**
 * Discriminated union for all Alpha Agent tool outputs.
 * The `type` field is the discriminator — the web app uses it to decide
 * which React component to render for each tool output.
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

/** Union of all alpha tool output types */
export type AlphaToolOutput =
  | TransactionsToSignOutput
  | PendingActionsOutput;
```

#### 2. Create displayPendingActionsTool

**File**: `packages/mastra/src/tools/alpha/display-pending-actions.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const displayPendingActionsTool = createTool({
  id: 'display-pending-actions',
  description: `Display the list of pending fuse actions to the user as a custom UI component.
Call this when the user asks to see, show, list, or display their pending actions / transactions.
Pass the current pendingActions from your working memory as input.`,
  inputSchema: z.object({
    actions: z.array(z.object({
      id: z.string(),
      protocol: z.enum(['aave-v3', 'morpho', 'euler-v2']),
      actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
      description: z.string(),
      fuseActions: z.array(z.object({
        fuse: z.string(),
        data: z.string(),
      })),
    })).describe('The pending actions from working memory to display'),
    message: z.string().optional().describe('Optional message to display with the actions'),
  }),
  outputSchema: z.object({
    type: z.literal('pending-actions'),
    actions: z.array(z.object({
      id: z.string(),
      protocol: z.enum(['aave-v3', 'morpho', 'euler-v2']),
      actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay']),
      description: z.string(),
      fuseActions: z.array(z.object({
        fuse: z.string(),
        data: z.string(),
      })),
    })),
    message: z.string(),
  }),
  execute: async ({ actions, message }) => {
    return {
      type: 'pending-actions' as const,
      actions: actions ?? [],
      message: message ?? (actions.length === 0
        ? 'No pending actions'
        : `${actions.length} pending action${actions.length === 1 ? '' : 's'}`),
    };
  },
});
```

#### 3. Remove old displayTransactionsTool, update exports

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Replace displayTransactionsTool with displayPendingActionsTool

```typescript
export { displayPendingActionsTool } from './display-pending-actions';
export { createAaveV3ActionTool } from './create-aave-v3-action';
export { createMorphoActionTool } from './create-morpho-action';
export { createEulerV2ActionTool } from './create-euler-v2-action';
export type { AlphaToolOutput, TransactionsToSignOutput, PendingActionsOutput } from './types';
```

**Note**: Keep `display-transactions.ts` file for now (FSN-0033 may reference it). The agent just won't use it.

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] Types importable: `import type { PendingActionsOutput } from '@wgenie/fusion-mastra/alpha-types'`

#### Manual Verification:
- [ ] In Studio: Agent can call displayPendingActionsTool with empty array → returns `{ type: 'pending-actions', actions: [], message: 'No pending actions' }`
- [ ] In Studio: Agent can call displayPendingActionsTool with sample actions → returns structured output

**Implementation Note**: After completing this phase, proceed to Phase 4.

---

## Phase 4: Frontend PendingActionsList Component

### Overview
Create a new React component that renders the pending actions list with human-readable descriptions and a discreet "copy raw payload" option. Add it as a case in the `AlphaToolRenderer` (from FSN-0033).

### Changes Required:

#### 1. Create PendingActionsList component

**File**: `packages/web/src/vault-details/components/pending-actions-list.tsx` (new)

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import type { PendingActionsOutput } from '@wgenie/fusion-mastra/alpha-types';

type PendingAction = PendingActionsOutput['actions'][number];

const PROTOCOL_LABELS: Record<string, string> = {
  'aave-v3': 'Aave V3',
  'morpho': 'Morpho',
  'euler-v2': 'Euler V2',
};

const ACTION_ICONS: Record<string, typeof ArrowUpRight> = {
  supply: ArrowUpRight,
  withdraw: ArrowDownLeft,
  borrow: ArrowUpRight,
  repay: ArrowDownLeft,
};

function ActionItem({ action }: { action: PendingAction }) {
  const [showPayload, setShowPayload] = useState(false);
  const [copied, setCopied] = useState(false);
  const Icon = ACTION_ICONS[action.actionType] ?? ArrowUpRight;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(action.fuseActions, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{action.description}</p>
            <p className="text-xs text-muted-foreground">
              {PROTOCOL_LABELS[action.protocol] ?? action.protocol} &middot; {action.actionType}
            </p>
          </div>
        </div>
      </div>

      {/* Discreet advanced option */}
      <button
        onClick={() => setShowPayload(!showPayload)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPayload ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Raw payload
      </button>

      {showPayload && (
        <div className="relative">
          <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-32">
            {JSON.stringify(action.fuseActions, null, 2)}
          </pre>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      )}
    </div>
  );
}

interface Props {
  actions: PendingAction[];
  message: string;
}

export function PendingActionsList({ actions, message }: Props) {
  if (actions.length === 0) {
    return (
      <Card className="p-4 border-dashed border-2 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">No actions queued</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListTodo className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionItem key={action.id} action={action} />
        ))}
      </div>
    </Card>
  );
}
```

#### 2. Add case to AlphaToolRenderer (extends FSN-0033)

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
**Changes**: Import `PendingActionsList` and add `case 'pending-actions'`

```tsx
import { PendingActionsList } from './pending-actions-list';
// ... existing imports ...

// In the switch(typed.type):
    case 'pending-actions':
      return <PendingActionsList actions={typed.actions} message={typed.message} />;
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/web && npx tsc --noEmit` compiles
- [ ] `cd packages/web && pnpm build` succeeds

#### Manual Verification:
- [ ] Navigate to ask-ai page → ask agent to show pending actions → empty state renders
- [ ] After creating an action, ask to show pending actions → action item renders with description
- [ ] Click "Raw payload" → hex data expands
- [ ] Click copy button → payload copied to clipboard

**Implementation Note**: After completing this phase and all verification passes, pause for manual testing.

---

## Phase 5: Update Agent Instructions

### Overview
Rewrite the Alpha Agent's system prompt to teach it the full workflow: creating actions, managing the pending list in working memory, and displaying actions.

### Changes Required:

#### 1. Update agent instructions

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Replace the `instructions` string

```typescript
export const alphaAgent = new Agent({
  id: 'alpha-agent',
  name: 'Alpha Agent',
  instructions: `You are an Alpha Agent for wGenie Fusion Plasma Vaults. You help users build a batch of fuse actions to execute on a vault.

## YOUR CAPABILITIES

You can create fuse actions using three DeFi protocol SDKs:
- **Aave V3**: supply, withdraw, borrow, repay (needs asset address + amount)
- **Morpho**: supply, withdraw, borrow, repay (needs Morpho market ID + amount)
- **Euler V2**: supply, withdraw (needs Euler vault address + amount)

## WORKFLOW

1. When the user asks to create an action, use the appropriate SDK tool (createAaveV3ActionTool, createMorphoActionTool, or createEulerV2ActionTool)
2. If the tool returns success, ADD the action to your working memory's pendingActions list. Generate a simple incremental ID ("1", "2", etc.). Copy the protocol, actionType, description, and fuseActions from the tool result.
3. When the user asks to see/show/list/display pending actions, call displayPendingActionsTool with the current pendingActions from your working memory.
4. When the user asks to remove an action, update your working memory pendingActions to exclude it.
5. When the user asks to clear all actions, set pendingActions to an empty array.

## WORKING MEMORY MANAGEMENT

Your working memory has a pendingActions array. After each SDK tool call that succeeds:
- Read your current pendingActions (may be empty or have existing items)
- Append the new action with all fields (id, protocol, actionType, description, fuseActions)
- The fuseActions field contains the raw encoded data — copy it exactly from the tool output

When removing actions, provide the complete updated array WITHOUT the removed item.

## IMPORTANT RULES

- ALWAYS use the SDK tools to create actions. NEVER fabricate FuseAction data.
- ALWAYS call displayPendingActionsTool to show actions. NEVER describe them in text only.
- The vaultAddress and chainId come from the conversation context. Use them when calling SDK tools.
- Amounts must be in the token's smallest unit (e.g., USDC has 6 decimals, so 1000 USDC = "1000000000").
- Keep responses concise.`,
  model: env.MODEL,
  tools: {
    displayPendingActionsTool,
    createAaveV3ActionTool,
    createMorphoActionTool,
    createEulerV2ActionTool,
  },
  memory,
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles

#### Manual Verification:
- [ ] Full flow test in Studio:
  1. Ask "Supply 1000000000 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) to Aave V3 on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 chain 1"
  2. Agent calls createAaveV3ActionTool → success
  3. Agent updates working memory with the new action
  4. Ask "show my pending actions"
  5. Agent calls displayPendingActionsTool with the actions list → output has `type: 'pending-actions'`
  6. Ask "remove action 1"
  7. Agent updates working memory → pendingActions is empty

**Implementation Note**: After completing this phase and all verification passes, pause for manual testing.

---

## Phase 6: Browser Testing

### Test Steps:

1. Start Mastra dev server: `cd packages/mastra && pnpm dev`
2. Start web app: `cd packages/web && pnpm dev`

#### Mastra Studio (localhost:4111):
- Navigate to alpha agent chat
- Send: "Supply 1000000000 of asset 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 to Aave V3 on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 on chain 1"
- Verify: Agent calls createAaveV3ActionTool, then updates working memory
- Send: "Show my pending actions"
- Verify: Agent calls displayPendingActionsTool, output has `type: 'pending-actions'` with 1 action
- Send: "Clear all actions"
- Verify: Working memory pendingActions is empty

#### Web App (localhost:3000):
- Navigate to `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai`
- Send: "Supply 1000000000 USDC to Aave V3" (agent should infer vault/chain from context)
- Verify: Agent calls SDK tool, updates working memory
- Send: "Show pending actions"
- Verify: PendingActionsList component renders with 1 action item
- Click "Raw payload" → hex data expands
- Click copy → payload copied
- Refresh page, same thread → send "show pending actions" → still has the action (memory persists)

#### chatRoute API:
- `curl -X POST http://localhost:4111/chat/alphaAgent -H 'Content-Type: application/json' -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"show pending actions"}]}]}'`
- Verify: streaming response with tool output

### Success Criteria:

#### Manual Verification:
- [ ] Studio: SDK tools create valid FuseAction data (hex strings in output)
- [ ] Studio: Working memory shows pendingActions array after creating actions
- [ ] Studio: displayPendingActionsTool output has `type: 'pending-actions'` discriminator
- [ ] Web app: PendingActionsList component renders with action items
- [ ] Web app: "Raw payload" toggle shows hex data, copy works
- [ ] Web app: Empty state renders correctly when no actions
- [ ] Web app: Memory persists across page refresh (same thread)
- [ ] No console errors in either environment

---

## Testing Strategy

### Unit Tests:
- None needed for this phase — the SDK tools are thin wrappers around already-tested market classes
- The working memory is managed by Mastra's framework

### Manual Testing Steps:
1. Create actions for all 3 protocols (Aave V3, Morpho, Euler V2)
2. Display the pending actions list
3. Remove individual actions
4. Clear all actions
5. Verify memory persistence across page refreshes
6. Test error cases (invalid vault address, unsupported chain)

## Performance Considerations

- `PlasmaVault.create()` makes 2 multicalls per tool invocation. The `getPublicClient()` cache reduces RPC overhead.
- Working memory adds a small read/write per agent turn — negligible for this use case.
- FuseAction hex strings in working memory are ~200 chars each — well within working memory limits.

## New Files Summary

```
packages/mastra/src/tools/alpha/
├── create-aave-v3-action.ts    (new)
├── create-morpho-action.ts     (new)
├── create-euler-v2-action.ts   (new)
├── display-pending-actions.ts  (new)
├── display-transactions.ts     (existing, kept for FSN-0033 compat)
├── types.ts                    (extended with PendingActionsOutput)
└── index.ts                    (updated exports)

packages/web/src/vault-details/components/
├── pending-actions-list.tsx    (new)
└── alpha-tool-renderer.tsx     (extended with pending-actions case)
```

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0034-alpha-agent-memory.md`
- Dependency ticket: `thoughts/kuba/tickets/fsn_0033-testing-alpha-agent-in-studio.md`
- FSN-0033 plan: `thoughts/shared/plans/2026-02-14-FSN-0033-testing-alpha-agent-in-studio.md`
- FSN-0031 alpha agent plan: `thoughts/shared/plans/2026-02-13-FSN-0031-alpha-agent.md`
- FSN-0032 SDK plan: `thoughts/shared/plans/2026-02-13-FSN-0032-alpha-markets-sdk.md`
- Mastra working memory docs: `@mastra/memory` section 04 (schema-based working memory)
- SDK market classes: `packages/sdk/src/markets/{aave-v3,morpho,euler-v2}/`
- Existing viem client utility: `packages/mastra/src/tools/plasma-vault/utils/viem-clients.ts`
- Alpha agent: `packages/mastra/src/agents/alpha-agent.ts`
