# YO Treasury — Vault Creation Page & Vault Detail Tab

## Overview

Two deliverables to integrate YO Treasury into the existing app:
1. A standalone vault creation page at `/yo-treasury/create` that creates a fully configured treasury vault on Base
2. A "YO Treasury" tab on the existing vault detail page at `/vaults/[chainId]/[address]/yo`

After creating a vault, the user manually copies the address, adds it to `plasma-vaults.json`, restarts ponder, then accesses the vault at `/vaults/8453/{address}/yo`.

## Current State Analysis

### Already Built:
- SDK vault creation functions in `packages/sdk/src/markets/yo/create-vault.ts` — `createAndConfigureVault()` does everything in one call
- YoRedeemFuse deployed to Base (4 instances, one per market)
- ZeroBalanceFuse deployed to Base (`0x706ca1cA4EcE9CF23301D6AB35ce6fb7Cf25DA15`)
- Mastra yo-treasury-agent with 7 tools, registered and tested
- Chat UI (`treasury-chat.tsx`), tool renderer (`yo-tool-renderer.tsx`), API route (`/api/yo/treasury/chat`)
- Sidebar nav entry for `/yo-treasury`

### Key Discoveries:
- SDK functions accept viem `PublicClient` + `WalletClient` — wagmi v2 exposes compatible clients via `usePublicClient()` and `useWalletClient()`
- Vault detail tabs defined in `packages/web/src/vault-details/vault-tabs.config.ts:9-30` — static array of `{ id, label, description }`
- Tab pages live at `packages/web/src/app/vaults/[chainId]/[address]/{tabId}/page.tsx`
- Alpha tab page pattern at `packages/web/src/app/vaults/[chainId]/[address]/alpha/page.tsx:9-22` — simple async component that passes params to a client component
- Vault layout at `layout.tsx:15-39` does NOT require vault to be in registry — it only uses registry for optional name/protocol display
- `TreasuryChat` component already accepts `chainId`, `vaultAddress`, `callerAddress` props

## What We're NOT Doing

- No onboarding stepper / wizard flow
- No first deposit prompt
- No vault discovery via wgenie-events API
- No dynamic ponder integration
- No dashboard view (chat-only for now)
- No changes to the Mastra agent or tools

## Implementation Approach

Phase 1 builds a simple creation page that calls the SDK. Phase 2 adds a tab to existing vault pages. Both are small, focused changes.

## Phase 1: Vault Creation Page

### Overview
A single page at `/yo-treasury/create` with a button that creates a fully configured treasury vault. Shows progress logs and the final vault address for copying.

### Changes Required:

#### 1. Create Page

**File**: `packages/web/src/app/yo-treasury/create/page.tsx` (new)

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { base } from 'viem/chains';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  createAndConfigureVault,
  type VaultCreationResult,
} from '@wgenie/fusion-sdk';

type Status = 'idle' | 'creating' | 'done' | 'error';

export default function CreateTreasuryVaultPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { data: walletClient } = useWalletClient({ chainId: base.id });

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<VaultCreationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
  }, []);

  const handleCreate = async () => {
    if (!address || !publicClient || !walletClient) return;

    setStatus('creating');
    setError(null);
    setLogs([]);

    try {
      addLog('Creating treasury vault on Base...');
      addLog(`Owner: ${address}`);

      const res = await createAndConfigureVault(publicClient, walletClient, {
        chainId: base.id,
        ownerAddress: address,
      });

      addLog(`Vault created: ${res.vaultAddress}`);
      addLog(`Access Manager: ${res.accessManagerAddress}`);
      addLog(`Tx: ${res.txHash}`);
      setResult(res);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      addLog(`Error: ${msg}`);
      setStatus('error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-1">
        Create Treasury Vault
      </h1>
      <p className="text-muted-foreground mb-6">
        Deploy a new Fusion PlasmaVault on Base configured for YO Treasury
      </p>

      <Card className="p-4 space-y-4">
        {!address && (
          <p className="text-sm text-muted-foreground">
            Connect your wallet to create a vault.
          </p>
        )}

        {address && status === 'idle' && (
          <Button onClick={handleCreate}>Create Treasury Vault</Button>
        )}

        {status === 'creating' && (
          <p className="text-sm text-muted-foreground">
            Creating vault... sign the transactions in your wallet.
          </p>
        )}

        {logs.length > 0 && (
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
            {logs.join('\n')}
          </pre>
        )}

        {result && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-600">
              Vault created successfully!
            </p>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 select-all">
                {result.vaultAddress}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this address, add it to plasma-vaults.json, and restart
              ponder.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </Card>
    </div>
  );
}
```

**Notes:**
- `createAndConfigureVault` runs all 6 steps sequentially (clone → roles → fuses → balance fuses → substrates → dependency graphs)
- Each step requires a wallet signature — user signs multiple transactions
- The `createAndConfigureVault` function internally calls `publicClient.waitForTransactionReceipt` between steps, so ordering is guaranteed
- On Base, each tx costs ~$0.01-0.05 in gas

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Page renders at `http://localhost:3000/yo-treasury/create`

#### Manual Verification:
- [ ] Connect wallet on Base
- [ ] Click "Create Treasury Vault" — signs ~16 transactions
- [ ] Vault address displayed and selectable for copying
- [ ] Vault address works at `/vaults/8453/{address}` (even without plasma-vaults.json entry — layout handles missing registry gracefully)

**Implementation Note**: After completing this phase, pause for manual testing. Create a vault, copy the address, add to `plasma-vaults.json`, restart ponder, verify at `/vaults/8453/{address}`.

---

## Phase 2: YO Treasury Tab on Vault Detail Page

### Overview
Add a "YO Treasury" tab next to the existing "Alpha" tab on vault detail pages. This tab renders the `TreasuryChat` component with the vault address from the URL.

### Changes Required:

#### 1. Add Tab Config

**File**: `packages/web/src/vault-details/vault-tabs.config.ts` (modify)

Add the `yo` tab entry after `alpha`:

```typescript
{
  id: 'yo',
  label: 'YO Treasury',
  description: 'AI-managed yield allocations via YO Protocol',
},
```

#### 2. Create Tab Page

**File**: `packages/web/src/app/vaults/[chainId]/[address]/yo/page.tsx` (new)

Following the exact pattern of `alpha/page.tsx`:

```tsx
import { TreasuryChat } from '@/yo-treasury/components/treasury-chat';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

export const metadata = {
  title: 'YO Treasury - Fusion by wGenie',
};

export default async function YoTreasuryPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;

  return (
    <YoTreasuryTab
      chainId={Number(chainId) as ChainId}
      vaultAddress={address as Address}
    />
  );
}
```

**Note**: `TreasuryChat` is a client component but this page is a server component (async). We need a thin client wrapper:

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx` (new)

```tsx
'use client';

import { TreasuryChat } from './treasury-chat';
import { useAccount } from 'wagmi';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoTreasuryTab({ chainId, vaultAddress }: Props) {
  const { address } = useAccount();

  return (
    <TreasuryChat
      chainId={chainId}
      vaultAddress={vaultAddress}
      callerAddress={address}
    />
  );
}
```

Then the page imports `YoTreasuryTab` instead of `TreasuryChat` directly.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Build succeeds: `cd packages/web && pnpm build`

#### Manual Verification:
- [ ] Navigate to `/vaults/8453/{vaultAddress}` — tabs show: Overview, Depositors, Activity, Alpha, YO Treasury
- [ ] Click "YO Treasury" tab — chat UI loads
- [ ] Chat with agent: "What are my yield options?" — returns YO vault data
- [ ] Chat with agent: "Show my allocation" — reads vault balances
- [ ] Agent receives correct vault address in context (check API route logs)

**Implementation Note**: After completing this phase, test the full flow: create vault → add to plasma-vaults.json → restart ponder → navigate to vault page → use YO Treasury tab.

---

## Manual Steps (Between Phases)

After Phase 1 creates a vault:

1. Copy vault address from creation page
2. Add to `plasma-vaults.json`:
   ```json
   {
     "name": "YO Treasury Demo",
     "address": "0x...",
     "chainId": 8453,
     "protocol": "YO Treasury",
     "tags": ["YO Treasury"],
     "startBlock": <current block number>,
     "url": ""
   }
   ```
3. Restart ponder: `cd packages/ponder && pnpm dev`
4. Navigate to `/vaults/8453/{address}/yo`

## Testing Strategy

### Playwright MCP:
- Test vault creation page renders and button is visible
- Test vault detail page shows YO Treasury tab
- Test chat interaction on the YO Treasury tab

### Manual Testing:
- Full vault creation on Base with real wallet
- Verify all 16 transactions succeed
- Verify vault appears at `/vaults/8453/{address}`
- Verify YO Treasury chat works with vault context

## References

- Ticket: `thoughts/kuba/tickets/fsn_0054-execute-next-step-yo-hackathon.md`
- SDK create-vault: `packages/sdk/src/markets/yo/create-vault.ts`
- Alpha tab pattern: `packages/web/src/app/vaults/[chainId]/[address]/alpha/page.tsx`
- Tab config: `packages/web/src/vault-details/vault-tabs.config.ts`
- Treasury chat: `packages/web/src/yo-treasury/components/treasury-chat.tsx`
- Chat API route: `packages/web/src/app/api/yo/treasury/chat/route.ts`
