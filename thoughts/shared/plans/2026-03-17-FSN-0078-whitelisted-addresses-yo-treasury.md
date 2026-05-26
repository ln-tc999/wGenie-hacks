# FSN-0078: Whitelisted Addresses for YO Treasury

## Overview

Add a `WHITELIST_ROLE` (800n) check to the YO Treasury deposit and withdraw forms. When the connected wallet lacks the role, both deposit and withdraw buttons are disabled. A visual indicator shows role status, and a link to the Fusion Access Manager page is provided.

## Current State Analysis

- Deposit form: `packages/web/src/yo-treasury/components/deposit-form.tsx`
- Withdraw form: `packages/web/src/yo-treasury/components/withdraw-form.tsx`
- Neither form currently checks any role before allowing transactions
- Existing two-step role check pattern in `packages/web/src/alpha/tools/execute-actions/execute-actions.tsx:106-126` — reads `getAccessManagerAddress()` from vault, then `hasRole(roleId, address)` from AccessManager
- `WHITELIST_ROLE = 800n` defined in `packages/sdk/src/access-manager/access-manager.types.ts:224`
- Inline minimal ABIs for `getAccessManagerAddress` and `hasRole` already defined in `execute-actions.tsx:31-56`

## Desired End State

- Connected wallet's WHITELIST_ROLE is checked on-chain via the vault's AccessManager
- Both deposit and withdraw buttons are disabled when role is missing, with label "Not whitelisted"
- A small green "Whitelisted" text appears when role is granted
- A link to `https://app.wGenie.io/fusion/base/0x09d1c2e03f73853916ee86b4e1a729f9fbaa960d/edit/access-manager` is shown so users can view/manage roles
- Role check only fires when wallet is connected and on the correct chain

## What We're NOT Doing

- No role-gating on the generic vault-actions forms (only yo-treasury)
- No server-side role checking
- No role granting from within the deposit/withdraw UI

## Implementation Approach

Create a shared `useWhitelistRole` hook, then integrate it into both forms.

## Phase 1: Hook + Both Forms

### Changes Required:

#### 1. New hook: `packages/web/src/yo-treasury/hooks/use-whitelist-role.ts`

A hook that performs the two-step on-chain read, modeled after `execute-actions.tsx:106-126`.

```ts
'use client';

import { useAccount, useReadContract } from 'wagmi';
import type { Address } from 'viem';

const WHITELIST_ROLE_ID = 800n;

const getAccessManagerAbi = [
  {
    type: 'function' as const,
    name: 'getAccessManagerAddress' as const,
    inputs: [],
    outputs: [{ name: '' as const, type: 'address' as const }],
    stateMutability: 'view' as const,
  },
] as const;

const hasRoleAbi = [
  {
    type: 'function' as const,
    name: 'hasRole' as const,
    inputs: [
      { name: 'roleId' as const, type: 'uint64' as const },
      { name: 'account' as const, type: 'address' as const },
    ],
    outputs: [
      { name: 'isMember' as const, type: 'bool' as const },
      { name: 'executionDelay' as const, type: 'uint32' as const },
    ],
    stateMutability: 'view' as const,
  },
] as const;

export function useWhitelistRole({
  chainId,
  vaultAddress,
}: {
  chainId: number;
  vaultAddress: Address;
}) {
  const { address, chain } = useAccount();
  const isCorrectChain = !!address && chain?.id === chainId;

  const { data: accessManagerAddress } = useReadContract({
    address: vaultAddress,
    abi: getAccessManagerAbi,
    functionName: 'getAccessManagerAddress',
    chainId,
    query: { enabled: isCorrectChain },
  });

  const { data: roleResult, isLoading: isCheckingRole } = useReadContract({
    address: accessManagerAddress as Address,
    abi: hasRoleAbi,
    functionName: 'hasRole',
    args: [WHITELIST_ROLE_ID, address!],
    chainId,
    query: {
      enabled: isCorrectChain && !!accessManagerAddress && !!address,
    },
  });

  const isWhitelisted = roleResult?.[0] === true;
  const isLoading = isCorrectChain && isCheckingRole;

  return { isWhitelisted, isLoading };
}
```

#### 2. Update `packages/web/src/yo-treasury/components/deposit-form.tsx`

**Import the hook:**
```ts
import { useWhitelistRole } from '../hooks/use-whitelist-role';
```

**Add hook call** (after `useVaultReads`):
```ts
const { isWhitelisted, isLoading: isRoleLoading } = useWhitelistRole({ chainId, vaultAddress });
```

**Update `buttonDisabled`** — add `!isWhitelisted`:
```ts
const buttonDisabled =
  !userAddress ||
  !isWhitelisted ||
  depositAmount === 0n ||
  parseError ||
  !hasEnoughBalance ||
  isBusy;
```

**Update `buttonLabel`** — add "Not whitelisted" case after the `!userAddress` check:
```ts
if (!userAddress) return 'Connect Wallet';
if (!isWhitelisted) return 'Not whitelisted';
// ...rest unchanged
```

**Add role indicator + Access Manager link** in the render, below the header `<div>`:
```tsx
{/* Whitelist status */}
{userAddress && !isWrongChain && (
  <div className="flex items-center justify-between text-xs">
    {isRoleLoading ? (
      <span className="text-muted-foreground">Checking role...</span>
    ) : isWhitelisted ? (
      <span className="text-green-500 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Whitelisted
      </span>
    ) : (
      <span className="text-destructive">Not whitelisted</span>
    )}
    <a
      href="https://app.wGenie.io/fusion/base/0x09d1c2e03f73853916ee86b4e1a729f9fbaa960d/edit/access-manager"
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:underline"
    >
      Access Manager
    </a>
  </div>
)}
```

`CheckCircle2` is already imported.

#### 3. Update `packages/web/src/yo-treasury/components/withdraw-form.tsx`

Same changes as deposit form:

**Import:**
```ts
import { useWhitelistRole } from '../hooks/use-whitelist-role';
```

**Hook call:**
```ts
const { isWhitelisted, isLoading: isRoleLoading } = useWhitelistRole({ chainId, vaultAddress });
```

**Update `buttonDisabled`:**
```ts
const buttonDisabled =
  !userAddress ||
  !isWhitelisted ||
  withdrawAmount === 0n ||
  parseError ||
  !hasEnoughPosition ||
  !sharesReady ||
  isBusy;
```

**Update `buttonLabel`:**
```ts
if (!userAddress) return 'Connect Wallet';
if (!isWhitelisted) return 'Not whitelisted';
// ...rest unchanged
```

**Add role indicator + link** (same JSX as deposit, below the header div).

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter @wgenie/fusion-web tsc --noEmit`
- [ ] Lint passes: `pnpm --filter @wgenie/fusion-web lint`
- [ ] Storybook builds without errors

#### Manual Verification:
- [ ] Connect a whitelisted wallet → green "Whitelisted" indicator shown, deposit/withdraw buttons work normally
- [ ] Connect a non-whitelisted wallet → "Not whitelisted" shown in red, both buttons disabled with "Not whitelisted" label
- [ ] "Access Manager" link opens `https://app.wGenie.io/fusion/base/0x09d1c2e03f73853916ee86b4e1a729f9fbaa960d/edit/access-manager` in new tab
- [ ] Disconnect wallet → no role indicator shown
- [ ] Wrong chain → chain switch button shown (no role indicator)

## References

- Ticket: `thoughts/kuba/tickets/fsn_0078-whitelisted-addresses-of-yo-treasury.md`
- Role check pattern: `packages/web/src/alpha/tools/execute-actions/execute-actions.tsx:106-126`
- Role constants: `packages/sdk/src/access-manager/access-manager.types.ts:224` (WHITELIST_ROLE = 800n)
