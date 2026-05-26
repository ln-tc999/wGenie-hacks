# YO Treasury — Web Chat Integration (Phase A)

## Overview

Connect the existing `yoTreasuryAgent` (Mastra) to the web app via a new `/yo-treasury` page with a chat UI. This is the fastest path to a demo-worthy feature — the agent and tools already exist, we just need the web plumbing and tool renderers.

## Current State Analysis

- **Agent**: `yoTreasuryAgent` is fully built with 7 tools, registered in Mastra at `packages/mastra/src/agents/yo-treasury-agent.ts`
- **Tools**: `getYoVaultsTool`, `getTreasuryAllocationTool`, 3 action tools, `displayPendingActionsTool`, `executePendingActionsTool`
- **Types**: `YoTreasuryToolOutput` union defined at `packages/mastra/src/tools/yo-treasury/types.ts` — types `yo-vaults`, `treasury-balances`, `action-with-simulation`
- **Shared types**: `pending-actions` and `execute-actions` from alpha tools
- **Web**: No `packages/web/src/yo-treasury/` directory exists. No chat API route for yo-treasury.
- **Patterns to copy**: Alpha chat at `vault-alpha.tsx`, API route at `api/vaults/[chainId]/[address]/chat/route.ts`, tool renderer at `alpha-tool-renderer.tsx`

### Key Discoveries:

- `@wgenie/fusion-mastra` package.json exports `"./alpha-types"` but NOT yo-treasury types — need to add export `packages/mastra/package.json:9`
- Sidebar nav is configured in `packages/web/src/components/sidebar/nav-config.ts:9-30` — array of `NavItem` objects
- Pages with sidebar use a `layout.tsx` that wraps children in `<SidebarLayout>` (e.g., `packages/web/src/app/vaults/layout.tsx`)
- `ProtocolIcon` at `packages/web/src/components/protocol-icon/protocol-icon.tsx:3-13` doesn't have `yo-erc4626` or `yo-swap` — falls back to showing first 2 chars, which is acceptable for now
- `ActionWithSimulation` component at `packages/web/src/vault-details/components/action-with-simulation.tsx` is reusable as-is for yo actions
- `ExecuteActions` component at `packages/web/src/vault-details/components/execute-actions.tsx` is reusable as-is
- `PendingActionsList` at `packages/web/src/vault-details/components/pending-actions-list.tsx` is reusable as-is
- The yo-treasury chat route needs `vaultAddress` + `chainId` — unlike alpha chat which gets these from URL params, the yo-treasury page gets them from user context (localStorage or wallet)

## Desired End State

A working `/yo-treasury` page in the web app with:
1. Sidebar navigation entry
2. Chat UI connected to `yoTreasuryAgent`
3. Tool renderers for all 5 tool output types (3 yo-specific + 2 shared)
4. User can ask "What are my yield options?" and see vault cards
5. User can ask "Show my allocation" and see treasury balances (if they provide a vault address)
6. Action tools render simulation results and execute-actions flow

### Verification:

- Open `http://localhost:3000/yo-treasury`
- Page renders with sidebar, chat input visible
- Type "What are my yield options?" — agent calls `getYoVaultsTool`, renders vault cards
- Type "Show my allocation" — agent calls `getTreasuryAllocationTool`
- Action creation tools render `ActionWithSimulation` cards
- `executePendingActionsTool` renders the 5-step `ExecuteActions` flow

## What We're NOT Doing

- Dashboard/portfolio view (Phase B)
- Deposit/withdraw forms (Phase C)
- Vault creation onboarding flow (Phase C)
- YoRedeemFuse deployment to Base (deferred)
- New protocol icons for `yo-erc4626`/`yo-swap` (fallback is fine)
- Mobile responsive polish (Phase 5)

## Implementation Approach

Copy the alpha chat pattern exactly, adapting for yo-treasury context. The yo-treasury page is simpler than alpha because it doesn't have URL params for vault/chain — instead, the user's treasury vault address will be provided via the chat context (the agent asks for it or reads from working memory). For the initial implementation, we pass `vaultAddress` and `chainId` from a simple state/localStorage mechanism on the page.

## Phase 1: Package Export for YO Treasury Types

### Overview

Add a package export so the web app can import yo-treasury type definitions.

### Changes Required:

#### 1. Add package export

**File**: `packages/mastra/package.json`
**Changes**: Add `"./yo-treasury-types"` export

```json
"exports": {
    ".": "./src/mastra/index.ts",
    "./agents": "./src/agents/index.ts",
    "./alpha-types": "./src/tools/alpha/types.ts",
    "./yo-treasury-types": "./src/tools/yo-treasury/types.ts"
}
```

### Success Criteria:

#### Automated Verification:

- [ ] `packages/mastra/package.json` has the new export entry
- [ ] TypeScript can resolve `import type { YoTreasuryToolOutput } from '@wgenie/fusion-mastra/yo-treasury-types'`

---

## Phase 2: Chat API Route

### Overview

Create a Next.js API route that streams `yoTreasuryAgent` responses.

### Changes Required:

#### 1. Create API route

**File**: `packages/web/src/app/api/yo/treasury/chat/route.ts` (new)
**Changes**: POST handler that streams yoTreasuryAgent

```typescript
import { NextRequest } from 'next/server';
import { isAddress } from 'viem';
import { toAISdkStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { yoTreasuryAgent } from '@wgenie/fusion-mastra/agents';

export async function POST(request: NextRequest) {
  const { messages, callerAddress, vaultAddress, chainId } = await request.json();

  const callerContext = callerAddress && isAddress(callerAddress, { strict: false })
    ? ` The user's connected wallet (callerAddress for simulation) is ${callerAddress}.`
    : '';

  const vaultContext = vaultAddress && isAddress(vaultAddress, { strict: false })
    ? ` The user's treasury vault address is ${vaultAddress} on chainId ${chainId}.`
    : ` The user has not created a treasury vault yet.`;

  const system = `CURRENT CONTEXT:${callerContext}${vaultContext} Chain: ${chainId ?? 8453} (Base).`;

  // Use a stable thread ID based on wallet address for working memory persistence
  const threadId = callerAddress
    ? `yo-treasury-${callerAddress.toLowerCase()}`
    : `yo-treasury-anonymous`;

  try {
    const result = await yoTreasuryAgent.stream(messages, {
      maxSteps: 5,
      system,
      memory: {
        thread: threadId,
        resource: threadId,
      },
    });

    const stream = toAISdkStream(result, { from: 'agent' });
    return createUIMessageStreamResponse({ stream: stream as any });
  } catch (error) {
    console.error('Error in yo-treasury agent stream', error);
    return new Response('An error occurred while processing your request.', {
      status: 500,
    });
  }
}
```

### Success Criteria:

#### Automated Verification:

- [ ] File exists at `packages/web/src/app/api/yo/treasury/chat/route.ts`
- [ ] TypeScript compiles without errors in `packages/web`

---

## Phase 3: Sidebar Navigation Entry

### Overview

Add a "YO Treasury" entry to the sidebar navigation.

### Changes Required:

#### 1. Add nav item

**File**: `packages/web/src/components/sidebar/nav-config.ts`
**Changes**: Add YO Treasury entry to `navItems` array

```typescript
import { Home, Vault, Activity, Users, Landmark, type LucideIcon } from 'lucide-react';

// Add to navItems array:
{
  title: 'YO Treasury',
  url: '/yo-treasury',
  icon: Landmark,
},
```

### Success Criteria:

#### Automated Verification:

- [ ] Sidebar shows "YO Treasury" link
- [ ] Clicking link navigates to `/yo-treasury`

---

## Phase 4: YO Treasury Page + Layout

### Overview

Create the page route with sidebar layout and a chat-centric view.

### Changes Required:

#### 1. Page layout

**File**: `packages/web/src/app/yo-treasury/layout.tsx` (new)

```typescript
'use client';

import { SidebarLayout } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function YoTreasuryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '/yo-treasury';
  return <SidebarLayout pathname={pathname}>{children}</SidebarLayout>;
}
```

#### 2. Page component

**File**: `packages/web/src/app/yo-treasury/page.tsx` (new)

```typescript
'use client';

import { TreasuryChat } from '@/yo-treasury/components/treasury-chat';
import { useAccount } from 'wagmi';
import { base } from 'viem/chains';

export default function YoTreasuryPage() {
  const { address } = useAccount();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">YO Treasury</h1>
        <p className="text-muted-foreground">
          AI-managed yield allocations across YO Protocol vaults
        </p>
      </div>
      <TreasuryChat
        chainId={base.id}
        vaultAddress={undefined}
        callerAddress={address}
      />
    </div>
  );
}
```

Note: `vaultAddress` is initially `undefined` — the agent handles this gracefully (it can list vaults without needing a treasury vault). When vault creation is added (Phase C), this will be populated from localStorage.

### Success Criteria:

#### Automated Verification:

- [ ] Page renders at `/yo-treasury` with sidebar
- [ ] TypeScript compiles

---

## Phase 5: Treasury Chat Component

### Overview

Chat UI component adapted from `vault-alpha.tsx`. Sends messages to the yo-treasury chat API route.

### Changes Required:

#### 1. Treasury chat component

**File**: `packages/web/src/yo-treasury/components/treasury-chat.tsx` (new)

Based on `packages/web/src/vault-details/components/vault-alpha.tsx` with these adaptations:
- API endpoint: `/api/yo/treasury/chat`
- Body includes `callerAddress`, `vaultAddress`, `chainId`
- Uses `YoToolRenderer` instead of `AlphaToolRenderer`
- Passes `vaultAddress` and `chainId` as props to tool renderer
- Placeholder text: "Ask about YO vaults or manage your treasury..."

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SendHorizontal, Bot, User } from 'lucide-react';
import { YoToolRenderer } from './yo-tool-renderer';
import type { Address } from 'viem';

interface Props {
  chainId: number;
  vaultAddress?: Address;
  callerAddress?: Address;
  className?: string;
}

export function TreasuryChat({ chainId, vaultAddress, callerAddress, className }: Props) {
  // Same structure as VaultAlpha but with:
  // - api: '/api/yo/treasury/chat'
  // - body: { callerAddress, vaultAddress, chainId }
  // - YoToolRenderer instead of AlphaToolRenderer
  // - Different placeholder text
  // ... (full implementation follows vault-alpha.tsx pattern exactly)
}
```

### Success Criteria:

#### Automated Verification:

- [ ] File exists at `packages/web/src/yo-treasury/components/treasury-chat.tsx`
- [ ] TypeScript compiles

---

## Phase 6: Tool Renderer

### Overview

Discriminated union switch that renders the correct component for each tool output type. Combines YO-specific types with shared alpha types.

### Changes Required:

#### 1. YO tool renderer

**File**: `packages/web/src/yo-treasury/components/yo-tool-renderer.tsx` (new)

```typescript
import { Loader2 } from 'lucide-react';
import { YoVaultsList } from './yo-vaults-list';
import { TreasuryBalances } from './treasury-balances';
import { ActionWithSimulation } from '@/vault-details/components/action-with-simulation';
import { PendingActionsList } from '@/vault-details/components/pending-actions-list';
import { ExecuteActions } from '@/vault-details/components/execute-actions';

interface ToolPartProps {
  state: string;
  output?: unknown;
  chainId: number;
}

export function YoToolRenderer({ state, output, chainId }: ToolPartProps) {
  if (state === 'input-available' || state === 'input-streaming') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  }

  if (state !== 'output-available' || !output) return null;

  const typed = output as { type: string; [key: string]: unknown };

  switch (typed.type) {
    case 'yo-vaults':
      return <YoVaultsList output={typed} />;
    case 'treasury-balances':
      return <TreasuryBalances output={typed} />;
    case 'action-with-simulation':
      return (
        <ActionWithSimulation
          success={typed.success as boolean}
          protocol={typed.protocol as string}
          actionType={typed.actionType as string}
          description={typed.description as string}
          error={typed.error as string | undefined}
          simulation={typed.simulation as any}
          chainId={chainId}
        />
      );
    case 'pending-actions':
      return (
        <PendingActionsList
          actions={typed.actions as any[]}
          message={typed.message as string}
        />
      );
    case 'execute-actions':
      return (
        <ExecuteActions
          vaultAddress={typed.vaultAddress as string}
          chainId={typed.chainId as number}
          flatFuseActions={typed.flatFuseActions as any[]}
          actionsCount={typed.actionsCount as number}
          fuseActionsCount={typed.fuseActionsCount as number}
          actionsSummary={typed.actionsSummary as string}
        />
      );
    default:
      return null;
  }
}
```

#### 2. YO Vaults List renderer

**File**: `packages/web/src/yo-treasury/components/yo-vaults-list.tsx` (new)

Renders vault cards from `getYoVaultsTool` output:

```typescript
import { Card } from '@/components/ui/card';
import type { YoVaultsOutput } from '@wgenie/fusion-mastra/yo-treasury-types';

interface Props {
  output: YoVaultsOutput;
}

export function YoVaultsList({ output }: Props) {
  if (!output.success) {
    return <Card className="p-3 text-sm text-destructive">{output.error ?? 'Failed to load vaults'}</Card>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{output.message}</p>
      <div className="grid gap-2">
        {output.vaults.map((vault) => (
          <Card key={vault.address} className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{vault.symbol}</span>
              <span className="text-sm text-green-500 font-mono">
                {vault.apy7d ? `${vault.apy7d}% APY` : 'APY N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Underlying: {vault.underlying}</span>
              <span>{vault.tvl ? `TVL: $${vault.tvl}` : ''}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{vault.address}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 3. Treasury Balances renderer

**File**: `packages/web/src/yo-treasury/components/treasury-balances.tsx` (new)

Renders the treasury allocation from `getTreasuryAllocationTool` output:

```typescript
import { Card } from '@/components/ui/card';
import type { TreasuryBalancesOutput } from '@wgenie/fusion-mastra/yo-treasury-types';

interface Props {
  output: TreasuryBalancesOutput;
}

export function TreasuryBalances({ output }: Props) {
  if (!output.success) {
    return <Card className="p-3 text-sm text-destructive">{output.error ?? 'Failed to load balances'}</Card>;
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Treasury Overview</span>
        <span className="text-sm font-mono">${output.totalValueUsd}</span>
      </div>

      {/* Unallocated tokens */}
      {output.assets.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Unallocated</p>
          {output.assets.map((asset) => (
            <div key={asset.address} className="flex items-center justify-between text-sm">
              <span>{asset.symbol}</span>
              <span className="font-mono">{asset.balanceFormatted} (${asset.valueUsd})</span>
            </div>
          ))}
        </div>
      )}

      {/* YO positions */}
      {output.yoPositions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">YO Allocations</p>
          {output.yoPositions.map((pos) => (
            <div key={pos.vaultAddress} className="flex items-center justify-between text-sm">
              <span>{pos.vaultSymbol}</span>
              <span className="font-mono">
                {pos.underlyingFormatted} {pos.underlyingSymbol} (${pos.valueUsd})
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{output.message}</p>
    </Card>
  );
}
```

### Success Criteria:

#### Automated Verification:

- [ ] All 3 new files exist
- [ ] TypeScript compiles
- [ ] `yo-vaults` type renders vault cards
- [ ] `treasury-balances` type renders allocation breakdown
- [ ] `action-with-simulation`, `pending-actions`, `execute-actions` reuse existing alpha components

---

## Testing Strategy

### Automated Verification:

- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Build succeeds: `cd packages/web && pnpm build`
- [ ] No new lint errors: `cd packages/web && pnpm lint`

### Manual Verification:

- [ ] Navigate to `http://localhost:3000/yo-treasury` — page renders with sidebar
- [ ] Sidebar shows "YO Treasury" link, highlighted when on the page
- [ ] Chat input is visible and functional
- [ ] Type "What are my yield options?" — agent responds with vault cards showing APY/TVL
- [ ] Type "Show my allocation" — agent responds (may show error if no vault address, which is expected)
- [ ] Agent responses stream progressively (not all at once)
- [ ] Tool loading state shows spinner while processing

**Implementation Note**: After completing all phases and automated verification passes, pause for manual confirmation.

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/mastra/package.json` | modify | Add `"./yo-treasury-types"` export |
| `packages/web/src/app/api/yo/treasury/chat/route.ts` | new | Chat API route for yoTreasuryAgent |
| `packages/web/src/components/sidebar/nav-config.ts` | modify | Add YO Treasury nav item |
| `packages/web/src/app/yo-treasury/layout.tsx` | new | Sidebar layout wrapper |
| `packages/web/src/app/yo-treasury/page.tsx` | new | Page component with chat |
| `packages/web/src/yo-treasury/components/treasury-chat.tsx` | new | Chat UI (adapted from vault-alpha.tsx) |
| `packages/web/src/yo-treasury/components/yo-tool-renderer.tsx` | new | Tool output switch |
| `packages/web/src/yo-treasury/components/yo-vaults-list.tsx` | new | YO vault cards renderer |
| `packages/web/src/yo-treasury/components/treasury-balances.tsx` | new | Treasury allocation renderer |

**Total**: 2 modified files, 7 new files

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0050-execute-next-step-yo-hackathon.md`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
- Architecture: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Alpha chat pattern: `packages/web/src/vault-details/components/vault-alpha.tsx`
- Alpha API route: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
- Alpha tool renderer: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
- YO agent: `packages/mastra/src/agents/yo-treasury-agent.ts`
- YO tool types: `packages/mastra/src/tools/yo-treasury/types.ts`
