# Alpha Agent Chat Storybook Story + Playwright Testing

## Overview

Create a Storybook story for the complete `VaultAskAi` chat component, proxying API calls to the running Next.js dev server. Then test it interactively using Playwright MCP (browser automation).

## Current State Analysis

- `VaultAskAi` at `packages/web/src/vault-details/components/vault-ask-ai.tsx` uses `useChat` with `DefaultChatTransport` hitting `/api/vaults/${chainId}/${vaultAddress}/chat`
- In Storybook (Vite on port 6006), that relative URL fails — no Next.js API routes available
- Storybook already has: `MockWalletDecorator`, `privateKeyConnector`, RPC env vars, theme decorator
- Tool renderer components that need wallet context: `ExecuteActions`, `SimulationResult`

### Key Discoveries:

- Vite dev server supports `server.proxy` — can forward `/api` to `http://localhost:3000` transparently (`packages/web/.storybook/main.ts:19` — `viteFinal`)
- `VaultAskAi` props: `{ chainId: ChainId, vaultAddress: Address }` — simple, no other dependencies
- `AlphaToolRenderer` renders tool outputs inline — needs `MockWalletDecorator` for ExecuteActions/SimulationResult
- Chat streams via `@ai-sdk/react` `useChat` — no special SSR dependencies

## Desired End State

A Storybook story at `packages/web/src/vault-details/components/vault-ask-ai.stories.tsx` that:
- Renders the real `VaultAskAi` component
- Proxies `/api` calls to the Next.js dev server on port 3000
- Includes `MockWalletDecorator` so ExecuteActions/SimulationResult tool outputs work
- Can be tested interactively via Playwright MCP

### Verification:
1. Start Next.js: `cd packages/web && pnpm dev` (port 3000)
2. Start Storybook: `cd packages/web && pnpm sb` (port 6006)
3. Open http://localhost:6006 → "Vault Details / VaultAskAi" story
4. Type "what are the balances?" → get real AI response with tool outputs rendered
5. Test via Playwright MCP: navigate, type, observe

## What We're NOT Doing

- NOT mocking the chat transport or AI responses
- NOT modifying the `VaultAskAi` component itself
- NOT creating stories for individual tool renderer components
- NOT adding MSW or other mocking infrastructure

## Implementation Approach

Add a Vite proxy in Storybook config to forward `/api` → `http://localhost:3000`. Create the story file with `MockWalletDecorator`. Test with Playwright.

---

## Phase 1: Add Vite Proxy to Storybook Config

### Overview
Configure Storybook's Vite dev server to proxy `/api` requests to the Next.js dev server.

### Changes Required:

#### 1. Add proxy config

**File**: `packages/web/.storybook/main.ts` (EDIT)

Add `server.proxy` to the `viteFinal` config:

```typescript
viteFinal: async (config) => {
  const env = loadEnv('', path.resolve(__dirname, '..'), '');

  return {
    ...config,
    server: {
      ...config.server,
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
    define: {
      // ... existing defines
    },
    resolve: {
      // ... existing resolve
    },
  };
},
```

### Success Criteria:

#### Automated Verification:
- [ ] Storybook starts without errors: `cd packages/web && pnpm sb`

---

## Phase 2: Create VaultAskAi Story

### Overview
Create a story that renders the real chat component with wallet decorator for Base chain vault.

### Changes Required:

#### 1. Create story file

**File**: `packages/web/src/vault-details/components/vault-ask-ai.stories.tsx` (NEW)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MockWalletDecorator } from '@/app/mock-wallet.decorator';
import { VaultAskAi } from './vault-ask-ai';

const meta: Meta<typeof VaultAskAi> = {
  title: 'Vault Details / VaultAskAi',
  component: VaultAskAi,
  decorators: [MockWalletDecorator],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof VaultAskAi>;

/** Real alpha agent chat for USDC vault on Base */
export const BaseUsdcVault: Story = {
  args: {
    chainId: 8453,
    vaultAddress: '0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04',
  },
};

/** Arbitrum vault chat */
export const ArbitrumVault: Story = {
  args: {
    chainId: 42161,
    vaultAddress: '0x3f97cee7500e70b9a4c tried8d65a108c7517cef62', // Replace with real Arbitrum vault
  },
};
```

Note: We'll use only the Base vault story for testing (the one we know works). The Arbitrum story can be added later with a real vault address.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit` (only pre-existing error)
- [ ] Storybook starts and shows story

#### Manual Verification:
- [ ] Story renders the chat UI with empty state ("Ask anything about this vault")
- [ ] Wallet auto-connects via private key (address shown in tool outputs if triggered)

---

## Phase 3: Test with Playwright MCP

### Overview
Use Playwright MCP (browser automation) to navigate to the story, type a message, and verify the chat works.

### Test Steps:
1. Navigate to `http://localhost:6006/?path=/story/vault-details-vaultaskai--base-usdc-vault`
2. Wait for the story to load
3. Find the chat input ("Ask about this vault...")
4. Type a message like "what are the current market balances?"
5. Press Enter or click the send button
6. Wait for the AI response to appear
7. Verify tool outputs render correctly

### Success Criteria:

#### Manual Verification (via Playwright):
- [ ] Chat input is visible and interactive
- [ ] Message sends successfully (no network errors)
- [ ] AI response streams back with text and/or tool outputs
- [ ] Tool output components render (MarketBalancesList, PendingActionsList, etc.)

---

## Prerequisites

Before testing:
1. Next.js dev server running: `cd packages/web && pnpm dev`
2. Storybook running: `cd packages/web && pnpm sb`
3. Required env vars set (RPC URLs, `ALPHA_CONFIG_TEST_PRIVATE_KEY`, Mastra env vars for the agent)

## References

- VaultAskAi component: `packages/web/src/vault-details/components/vault-ask-ai.tsx`
- AlphaToolRenderer: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
- ExecuteActions story: `packages/web/src/vault-details/components/execute-actions.stories.tsx`
- MockWalletDecorator: `packages/web/src/app/mock-wallet.decorator.tsx`
- Storybook config: `packages/web/.storybook/main.ts`
- Chat API route: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
- Execute actions storybook plan: `thoughts/shared/plans/2026-02-15-execute-actions-storybook.md`
