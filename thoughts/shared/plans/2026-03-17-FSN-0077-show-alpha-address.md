# FSN-0077: Show Alpha Address of YO Treasury

## Overview

Replace the "Active Vaults" stat card on the YO Treasury overview page with an "Alpha Role" card that shows whether the connected wallet has the Alpha role on this vault, and links to the Fusion Access Manager page for full role management.

## Current State

- `portfolio-summary.tsx` renders 4 stat cards: Total Value, Allocated, Unallocated, **Active Vaults**
- The "Active Vaults" card (line 150-159) shows `X / Y` (active/total positions)
- The two-step `hasRole` pattern (vault → AccessManager → hasRole) already exists in `execute-actions.tsx:105-127`
- ALPHA_ROLE = 200n

## Desired End State

The 4th stat card shows:
- **Label**: "Alpha Role"
- **Value**: Connected wallet's alpha status — checkmark + "Granted" or cross + "Not Granted"
- **Not connected state**: "Connect wallet"
- **Sub-value**: Link to [Fusion Access Manager](https://app.wGenie.io/fusion/base/0x09d1c2e03f73853916ee86b4e1a729f9fbaa960d/edit/access-manager) — "Manage roles"

## What We're NOT Doing

- NOT reading `RoleGranted`/`RoleRevoked` events from chain
- NOT updating Ponder indexer to index role events
- NOT showing a list of all Alpha addresses (that's in the Fusion app — we link to it)

## Implementation Approach

Single phase: create a hook for the `hasRole` check, replace the 4th stat card.

## Phase 1: Alpha Role Card

### Changes Required:

#### 1. New hook: `packages/web/src/yo-treasury/hooks/use-alpha-role.ts`

Two-step wagmi read (same pattern as `execute-actions.tsx:105-127`):

```typescript
'use client';

import { useReadContract } from 'wagmi';
import type { Address } from 'viem';

const ALPHA_ROLE_ID = 200n;

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

interface UseAlphaRoleParams {
  chainId: number;
  vaultAddress: Address;
  userAddress: Address | undefined;
}

export function useAlphaRole({ chainId, vaultAddress, userAddress }: UseAlphaRoleParams) {
  const { data: accessManagerAddress } = useReadContract({
    address: vaultAddress,
    abi: getAccessManagerAbi,
    functionName: 'getAccessManagerAddress',
    chainId,
  });

  const { data: roleResult, isLoading } = useReadContract({
    address: accessManagerAddress as Address,
    abi: hasRoleAbi,
    functionName: 'hasRole',
    args: [ALPHA_ROLE_ID, userAddress!],
    chainId,
    query: {
      enabled: !!accessManagerAddress && !!userAddress,
    },
  });

  return {
    hasAlphaRole: roleResult?.[0] === true,
    isLoading: !!userAddress && isLoading,
    isConnected: !!userAddress,
  };
}
```

#### 2. Modify `packages/web/src/yo-treasury/components/portfolio-summary.tsx`

- Add `chainId`, `vaultAddress`, `userAddress` props
- Import and call `useAlphaRole`
- Replace the 4th StatCard ("Active Vaults") with an "Alpha Role" card:
  - Icon: `Shield` (from lucide-react)
  - Not connected: value="Connect wallet", subValue=link to Access Manager
  - Loading: show spinner
  - Has role: value="Granted" (green accent), subValue=link
  - No role: value="Not Granted", subValue=link

The link sub-value is an `<a>` to `https://app.wGenie.io/fusion/base/0x09d1c2e03f73853916ee86b4e1a729f9fbaa960d/edit/access-manager` with text "Manage roles".

#### 3. Update `packages/web/src/yo-treasury/components/treasury-dashboard.tsx`

Pass `chainId`, `vaultAddress`, and `userAddress` to `PortfolioSummary`.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm --filter web typecheck`
- [ ] No lint errors

#### Manual Verification:
- [ ] 4th stat card shows "Alpha Role" instead of "Active Vaults"
- [ ] When wallet not connected: shows "Connect wallet"
- [ ] When wallet connected with alpha role: shows "Granted" in green
- [ ] When wallet connected without alpha role: shows "Not Granted"
- [ ] "Manage roles" link opens the Fusion Access Manager page
- [ ] Other 3 stat cards unchanged

## References

- Ticket: `thoughts/kuba/tickets/fsn_0077-show-alpha-address-of-yo-treasury.md`
- Existing hasRole pattern: `packages/web/src/alpha/tools/execute-actions/execute-actions.tsx:105-127`
- Target component: `packages/web/src/yo-treasury/components/portfolio-summary.tsx:150-159`
