# ExecuteActions Storybook Testing Environment

## Overview

Create a Storybook story for the `ExecuteActions` component with a real wagmi wallet connection using a private key connector. This enables testing the full multi-step flow (connect → chain switch → ALPHA_ROLE check → simulate → execute) without a browser wallet extension.

## Current State Analysis

- `ExecuteActions` component exists at `packages/web/src/vault-details/components/execute-actions.tsx`
- No stories exist for any vault-details components
- Storybook is configured in `packages/web/.storybook/` with react-vite framework
- `AppProviders` decorator exists (`packages/web/src/app/app-providers-decorator.tsx`) but uses `injected()` connector — useless without a browser extension
- wgenie-webapp has a working `privateKeyConnector` + `MockWalletDecorator` pattern we can port

### Key Discoveries:

- Private key connector from wgenie-webapp (`wgenie-webapp/src/app/private-key-connector.ts`) handles signing locally and delegates RPC calls to the chain's HTTP transport
- The connector supports `switchChain`, `connect`, `disconnect`, `getProvider` with local signing for `personal_sign` and `eth_signTypedData_v4`
- Storybook main.ts already passes `NEXT_PUBLIC_RPC_URL_*` env vars — we just need to add `ALPHA_CONFIG_TEST_PRIVATE_KEY`
- The wagmi config needs all 3 chains (mainnet, arbitrum, base) + their transports for the component's `usePublicClient({ chainId })` and `useReadContract({ chainId })` hooks to work

## Desired End State

A Storybook story at `packages/web/src/vault-details/components/execute-actions.stories.tsx` that:
- Auto-connects a wallet using the private key from env var
- Renders the `ExecuteActions` component with realistic mock fuse action data (1 USDC supply to Aave V3 on Base)
- Allows testing the full flow: connected wallet → chain switch → ALPHA_ROLE check → simulate → execute

### Verification:
- `cd packages/web && pnpm sb` → open http://localhost:6006
- Navigate to ExecuteActions story
- Component renders with wallet auto-connected
- Step flow progresses through role check → simulate → execute

## What We're NOT Doing

- NOT adding stories for SimulationResult, PendingActionsList, or other alpha components
- NOT adding MockWalletDecorator to global storybook preview (it's per-story)
- NOT creating a WalletContext bridge (monorepo doesn't have a WalletContext like wgenie-webapp)
- NOT modifying the ExecuteActions component itself

## Implementation Approach

Port the `privateKeyConnector` from wgenie-webapp (pure viem/wagmi, no app-specific deps). Create a lightweight `MockWalletDecorator` that wraps stories with WagmiProvider + QueryClient + AutoConnect. Expose the private key env var in storybook config. Create the story file.

---

## Phase 1: Port Private Key Connector

### Overview
Copy the private key connector from wgenie-webapp. It's already self-contained with only viem/wagmi dependencies.

### Changes Required:

#### 1. Create private-key-connector

**File**: `packages/web/src/app/private-key-connector.ts` (NEW)

Copy verbatim from `/Users/kuba/wgenie-labs/wgenie-webapp/src/app/private-key-connector.ts` — all imports are from `viem` and `wagmi`, no app-specific deps.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit` (only pre-existing error)

---

## Phase 2: Create MockWalletDecorator + Storybook Config

### Overview
Create a decorator that provides a real wagmi connection via private key, and expose the env var in storybook config.

### Changes Required:

#### 1. Create MockWalletDecorator

**File**: `packages/web/src/app/mock-wallet.decorator.tsx` (NEW)

Simplified version of wgenie-webapp's decorator — no WalletContext bridge needed:

```tsx
'use client';

import { useEffect } from 'react';
import type { Decorator } from '@storybook/react';
import { type Hex } from 'viem';
import {
  WagmiProvider,
  createConfig,
  http,
  useAccount,
  useConnect,
} from 'wagmi';
import { mainnet, arbitrum, base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { privateKeyConnector } from './private-key-connector';

const privateKey = import.meta.env.ALPHA_CONFIG_TEST_PRIVATE_KEY as Hex | undefined;

const queryClient = new QueryClient();

const mockWagmiConfig = privateKey
  ? createConfig({
      connectors: [privateKeyConnector({ privateKey })],
      chains: [mainnet, arbitrum, base],
      transports: {
        [mainnet.id]: http(import.meta.env.NEXT_PUBLIC_RPC_URL_MAINNET),
        [arbitrum.id]: http(import.meta.env.NEXT_PUBLIC_RPC_URL_ARBITRUM),
        [base.id]: http(import.meta.env.NEXT_PUBLIC_RPC_URL_BASE),
      },
    })
  : undefined;

const AutoConnect = ({ children }: { children: React.ReactNode }) => {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected && connectors[0]) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

  return children;
};

export const MockWalletDecorator: Decorator = (Story) => {
  if (!mockWagmiConfig) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>ALPHA_CONFIG_TEST_PRIVATE_KEY env var not set.</p>
        <p className="mt-2 text-sm">
          Add it to your .env file and restart Storybook.
        </p>
      </div>
    );
  }

  return (
    <WagmiProvider config={mockWagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnect>
          <Story />
        </AutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
```

#### 2. Expose env var in storybook config

**File**: `packages/web/.storybook/main.ts` (EDIT)

Add `ALPHA_CONFIG_TEST_PRIVATE_KEY` to the `env` function:

```typescript
env: (config) => ({
  ...config,
  NEXT_PUBLIC_RPC_URL_MAINNET: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
  NEXT_PUBLIC_RPC_URL_ARBITRUM: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM,
  NEXT_PUBLIC_RPC_URL_BASE: process.env.NEXT_PUBLIC_RPC_URL_BASE,
  ALPHA_CONFIG_TEST_PRIVATE_KEY: process.env.ALPHA_CONFIG_TEST_PRIVATE_KEY,
}),
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`

---

## Phase 3: Create ExecuteActions Story

### Overview
Create a story with realistic mock data — 1 USDC supply action to Aave V3 on Base, using vault `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04`.

### Changes Required:

#### 1. Create story file

**File**: `packages/web/src/vault-details/components/execute-actions.stories.tsx` (NEW)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MockWalletDecorator } from '@/app/mock-wallet.decorator';
import { ExecuteActions } from './execute-actions';

const meta: Meta<typeof ExecuteActions> = {
  title: 'Vault Details / ExecuteActions',
  component: ExecuteActions,
  decorators: [MockWalletDecorator],
};

export default meta;
type Story = StoryObj<typeof ExecuteActions>;

/** Supply 1 USDC to Aave V3 on Base — real vault, real fuse action data */
export const SupplyUsdcAaveV3: Story = {
  args: {
    vaultAddress: '0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04',
    chainId: 8453,
    flatFuseActions: [
      {
        fuse: '0x26fD6EF391E98C78CfCA27e00c3d15be4D941625',
        data: '0x41b11ae7000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000000',
      },
    ],
    actionsCount: 1,
    fuseActionsCount: 1,
    actionsSummary: 'supply on aave-v3: Aave V3 supply 1000000 of asset 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
};

/** Multiple actions — supply + borrow */
export const MultipleActions: Story = {
  args: {
    vaultAddress: '0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04',
    chainId: 8453,
    flatFuseActions: [
      {
        fuse: '0x26fD6EF391E98C78CfCA27e00c3d15be4D941625',
        data: '0x41b11ae7000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000000',
      },
      {
        fuse: '0x26fD6EF391E98C78CfCA27e00c3d15be4D941625',
        data: '0x41b11ae7000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda0291300000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000000',
      },
    ],
    actionsCount: 2,
    fuseActionsCount: 2,
    actionsSummary: 'supply on aave-v3: Aave V3 supply 1000000 USDC\nborrow on aave-v3: Aave V3 borrow 1000000 USDC',
  },
};
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Storybook starts: `cd packages/web && pnpm sb`

#### Manual Verification:
- [ ] Open http://localhost:6006 → "Vault Details / ExecuteActions" story visible
- [ ] SupplyUsdcAaveV3 story renders with wallet auto-connected (Step 1 shows green check)
- [ ] Step 2 (chain switch) works — if connected to wrong chain, switch button appears
- [ ] Step 3 (ALPHA_ROLE check) runs automatically after correct chain
- [ ] Step 4 (Simulate) button appears after role check passes → clicking it runs client-side simulation
- [ ] Step 5 (Execute) button appears after simulation succeeds → clicking sends real tx

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual testing.

---

## Testing Strategy

### Manual Testing Steps:
1. Ensure `ALPHA_CONFIG_TEST_PRIVATE_KEY` is in `.env` (same key as wgenie-webapp)
2. `cd packages/web && pnpm sb`
3. Open http://localhost:6006 → navigate to "Vault Details / ExecuteActions"
4. Verify wallet auto-connects (address shown, Step 1 green)
5. Verify chain detection and ALPHA_ROLE check flow
6. Click Simulate → verify client-side eth_call succeeds or fails with meaningful error
7. If simulation succeeds, click Execute → verify tx is signed and sent

## References

- ExecuteActions component: `packages/web/src/vault-details/components/execute-actions.tsx`
- wgenie-webapp private-key-connector: `wgenie-webapp/src/app/private-key-connector.ts`
- wgenie-webapp mock-wallet decorator: `wgenie-webapp/src/app/mock-wallet.decorator.tsx`
- Storybook config: `packages/web/.storybook/main.ts`
- Existing AppProviders decorator: `packages/web/src/app/app-providers-decorator.tsx`
- Wagmi provider: `packages/web/src/app/wagmi-provider.tsx`
