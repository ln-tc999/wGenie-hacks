# FSN-0055: Vault Creation Page — UX Refinement

## Overview

Refactor the vault creation page at `/yo-treasury/create` from a single-button `createAndConfigureVault()` call into a multi-step, per-transaction UX. Each step reads on-chain state to detect completion, shows individual transaction buttons with feedback, and supports retry on failure. Uses wagmi hooks (`useWriteContract` / `useWaitForTransactionReceipt`) matching the `execute-actions.tsx` pattern already in the monorepo.

## Current State Analysis

**Current page** (`packages/web/src/app/yo-treasury/create/page.tsx`):
- Calls SDK's `createAndConfigureVault()` which fires ~16 sequential transactions via `WalletClient` — not wagmi-compatible
- Shows static "Creating vault..." with no per-step feedback
- No error recovery, no retry, no on-chain state detection
- No post-creation guidance (vault address copy, link to vault page)

**Best patterns found in the codebase**:
1. `packages/web/src/vault-details/components/execute-actions.tsx` — `StepRow` component with 4 states (`pending | loading | done | error`), wagmi `useWriteContract` + `useWaitForTransactionReceipt`
2. `wgenie-webapp/src/fusion/setup/configure-vault-access/` — Per-transaction items with `TransactionStatus` derived from on-chain state (`isAlreadyDone`) and tx state (`isPending | isConfirming | error`)
3. `wgenie-webapp/src/fusion/wizard/create-vault-wizard/steps/create-vault/components/create-vault-transaction-button.tsx` — `TransactionButtonState` with 5 visual states

### Key Discoveries:
- SDK functions in `create-vault.ts` use `simulateContract → writeContract` pattern (no `waitForTransactionReceipt`) — we need to add receipt waiting
- `PlasmaVault.grantRole()` targets the AccessManager contract, not the vault itself (`plasmaVault.ts:106-120`)
- `PlasmaVault.addBalanceFuse()` swaps arg order in ABI call: `[marketId, fuseAddress]` (`plasmaVault.ts:90-104`)
- All 17 transactions across 6 groups can be mapped to specific ABI calls with known addresses from `yo.addresses.ts` and `yo.constants.ts`

## Desired End State

A step-by-step vault creation page where:
1. User clicks one button per logical group of transactions
2. Each step shows pending/loading/done/error status
3. On-chain state is read to detect already-completed steps (supports page refresh, resume)
4. Only vault address is stored in localStorage — all other state read from chain
5. After completion, vault address is shown with copy button and link to `/vaults/8453/{address}`
6. Storybook story works with WalletDecorator for development/testing

### Verification:
- Renders correctly in Storybook at `localhost:6007`
- Each step can be triggered individually
- Page refresh after step 1 (clone) resumes correctly
- Error on any step shows retry button
- Successful completion shows vault address + link

## What We're NOT Doing

- No wizard/multi-page flow — all steps on one page
- No ContextManager batching — each group is a separate transaction (simpler, more transparent)
- No scheduled operations or timelock support
- No `createAndConfigureVault` SDK function usage — reproduce logic directly with wagmi
- No form inputs (vault name, symbol, etc.) — use defaults with owner address + date
- No mobile-specific layout work
- No analytics/tracking events

## Implementation Approach

**Architecture**: One page component that renders a list of `TransactionStep` components. Each step:
1. Reads on-chain state to determine if already complete
2. Shows a `StepRow`-style status indicator
3. Has a trigger button that calls `useWriteContract`
4. Tracks tx confirmation with `useWaitForTransactionReceipt`
5. Unlocks the next step on success

**Transaction Groups** (6 steps, 17 total txs — some steps batch via the contract itself):

| # | Step | Txs | Contract | Function |
|---|------|-----|----------|----------|
| 1 | Clone Vault | 1 | FusionFactory | `clone(name, symbol, underlying, delay, owner, feeIndex)` |
| 2 | Grant Roles | 4 | AccessManager | `grantRole(role, account, executionDelay)` × 4 roles |
| 3 | Add Fuses | 1 | PlasmaVault | `addFuses(address[])` — 9 fuses in one call |
| 4 | Add Balance Fuses | 5 | PlasmaVault | `addBalanceFuse(marketId, fuse)` × 5 (4 ERC4626 + 1 ZeroBalance) |
| 5 | Configure Substrates | 5 | PlasmaVault | `grantMarketSubstrates(marketId, substrates[])` × 5 |
| 6 | Update Dependency Graphs | 4 | PlasmaVault | `updateDependencyBalanceGraph(marketId, [])` × 4 |

Steps 2, 4, 5, 6 have multiple sub-transactions that will be executed sequentially within one step (auto-advance after each tx confirms).

**On-chain state detection** for each step:
1. **Clone**: vault address exists in localStorage → read `PlasmaVault.totalSupply()` to verify it's a valid contract
2. **Grant Roles**: `AccessManager.hasRole(roleId, owner)` for all 4 roles
3. **Add Fuses**: `PlasmaVault.getFuses()` returns array — check if length >= 9
4. **Add Balance Fuses**: `PlasmaVault.getBalanceFuses(marketId)` for each of the 5 markets
5. **Configure Substrates**: `PlasmaVault.getMarketSubstrates(marketId)` for each of the 5 markets
6. **Update Dependency Graphs**: Read `PlasmaVault.getDependencyBalanceGraph(marketId)` — check it returns empty array (which means it was set, vs reverting which means it wasn't)

---

## Phase 1: Shared Components & Hooks

### Overview
Create the reusable `StepRow` component (extracted from `execute-actions.tsx`) and the `useTransactionStep` hook that wraps wagmi's `useWriteContract` + `useWaitForTransactionReceipt`.

### Changes Required:

#### 1. Extract StepRow component

**File**: `packages/web/src/app/yo-treasury/create/components/step-row.tsx` (new)

```tsx
'use client';

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'loading' | 'done' | 'error';

interface StepRowProps {
  number: number;
  label: string;
  status: StepStatus;
  detail?: string;
}

export function StepRow({ number, label, status, detail }: StepRowProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'done' ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      ) : status === 'loading' ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
      ) : status === 'error' ? (
        <XCircle className="w-5 h-5 text-destructive shrink-0" />
      ) : (
        <span className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">
          {number}
        </span>
      )}
      <span
        className={`text-sm font-medium ${
          status === 'done'
            ? 'text-green-500'
            : status === 'error'
              ? 'text-destructive'
              : 'text-foreground'
        }`}
      >
        {label}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          — {detail}
        </span>
      )}
    </div>
  );
}
```

#### 2. Create vault creation constants

**File**: `packages/web/src/app/yo-treasury/create/vault-creation.constants.ts` (new)

Contains all ABI fragments, addresses, roles, market IDs, and fuse addresses needed for the 6 steps. Import from `@wgenie/fusion-sdk` where possible, inline minimal ABI fragments for wagmi's `useWriteContract`.

```typescript
import { base } from 'viem/chains';
import {
  FUSION_FACTORY_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  // ... all fuse addresses
  YO_USDC_ADDRESS,
  // ... all token/router addresses
} from '@wgenie/fusion-sdk';
import { YO_TREASURY_ROLES, YO_VAULT_SLOTS, SWAP_MARKET_ID } from '@wgenie/fusion-sdk';

export const CHAIN_ID = base.id;

// Minimal ABI fragments for each step (inline, typed for wagmi)
export const fusionFactoryCloneAbi = [...] as const;
export const accessManagerGrantRoleAbi = [...] as const;
export const plasmaVaultAddFusesAbi = [...] as const;
export const plasmaVaultAddBalanceFuseAbi = [...] as const;
export const plasmaVaultGrantMarketSubstratesAbi = [...] as const;
export const plasmaVaultUpdateDependencyBalanceGraphAbi = [...] as const;
export const plasmaVaultGetAccessManagerAbi = [...] as const;
export const accessManagerHasRoleAbi = [...] as const;
export const plasmaVaultGetFusesAbi = [...] as const;

// Pre-computed arrays
export const ALL_FUSE_ADDRESSES = [...]; // 9 fuses
export const ROLES_TO_GRANT = [
  YO_TREASURY_ROLES.ATOMIST,
  YO_TREASURY_ROLES.FUSE_MANAGER,
  YO_TREASURY_ROLES.ALPHA,
  YO_TREASURY_ROLES.WHITELIST,
];
// ... etc
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm typecheck`
- [ ] Files exist at expected paths

#### Manual Verification:
- [ ] N/A (no visible changes yet)

---

## Phase 2: Step 1 — Clone Vault

### Overview
Implement the first transaction step: cloning a new PlasmaVault via FusionFactory. This is the only step that creates a new address. After success, the vault address is stored in localStorage and used by all subsequent steps.

### Changes Required:

#### 1. Clone Vault Step Component

**File**: `packages/web/src/app/yo-treasury/create/steps/clone-vault-step.tsx` (new)

Props: `{ ownerAddress: Address; onVaultCreated: (vaultAddress: Address, accessManagerAddress: Address) => void }`

Logic:
- Uses `useWriteContract` to call `FusionFactory.clone(name, symbol, USDC, 1n, owner, 0n)`
- Uses `useWaitForTransactionReceipt` to wait for confirmation
- On confirmation, reads the `PlasmaVaultCreated` event from receipt logs to extract vault + access manager addresses
- Calls `onVaultCreated` callback
- Auto-generates vault name: `YO Treasury ${truncatedAddress} ${date}`

State detection:
- If vault address already in localStorage, show as "done" with the address
- Show a "Start Fresh" button to clear and create a new vault

#### 2. localStorage helper

**File**: `packages/web/src/app/yo-treasury/create/use-vault-address.ts` (new)

```typescript
const STORAGE_KEY = 'yo-treasury-vault-address';

export function useVaultAddress() {
  // Returns [vaultAddress, setVaultAddress, clearVaultAddress]
  // Uses useState initialized from localStorage
  // setVaultAddress also writes to localStorage
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm typecheck`

#### Manual Verification:
- [ ] In Storybook, step 1 shows "Clone Vault" with trigger button
- [ ] Clicking triggers wallet signature
- [ ] After confirmation, vault address appears and is stored in localStorage
- [ ] Page refresh shows step 1 as "done" with the stored address

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Steps 2-6 — Configuration Steps

### Overview
Implement the remaining 5 configuration steps. Each step reads on-chain state to detect completion, then provides a button to execute the transaction(s).

### Changes Required:

#### 1. Grant Roles Step

**File**: `packages/web/src/app/yo-treasury/create/steps/grant-roles-step.tsx` (new)

Props: `{ vaultAddress: Address; accessManagerAddress: Address; ownerAddress: Address }`

- Reads `hasRole` for all 4 roles to detect which are already granted
- For each missing role, calls `accessManager.grantRole(roleId, owner, 0)` sequentially
- Shows sub-progress: "Granting role 2/4..."
- All 4 done → step complete

On-chain detection: `useReadContract` calls to `AccessManager.hasRole()` for each of the 4 roles.

#### 2. Add Fuses Step

**File**: `packages/web/src/app/yo-treasury/create/steps/add-fuses-step.tsx` (new)

Props: `{ vaultAddress: Address }`

- Single transaction: `PlasmaVault.addFuses([...9 fuse addresses])`
- On-chain detection: `PlasmaVault.getFuses()` — check if all 9 are present

#### 3. Add Balance Fuses Step

**File**: `packages/web/src/app/yo-treasury/create/steps/add-balance-fuses-step.tsx` (new)

Props: `{ vaultAddress: Address }`

- 5 sequential transactions: `PlasmaVault.addBalanceFuse(marketId, fuseAddress)` for 4 ERC4626 markets + 1 swap market
- Note: ABI arg order is `[marketId, fuseAddress]` (confirmed from `PlasmaVault.ts:96`)
- Shows sub-progress: "Adding balance fuse 3/5..."
- On-chain detection: Check each market has a balance fuse set

#### 4. Configure Substrates Step

**File**: `packages/web/src/app/yo-treasury/create/steps/configure-substrates-step.tsx` (new)

Props: `{ vaultAddress: Address }`

- 5 sequential transactions: `PlasmaVault.grantMarketSubstrates(marketId, substrates[])` for 4 ERC4626 markets + 1 swap market
- On-chain detection: `getMarketSubstrates()` for each market

#### 5. Update Dependency Graphs Step

**File**: `packages/web/src/app/yo-treasury/create/steps/update-deps-step.tsx` (new)

Props: `{ vaultAddress: Address }`

- 4 sequential transactions: `PlasmaVault.updateDependencyBalanceGraph(marketId, [])` for 4 ERC4626 markets
- On-chain detection: Read dependency graph state

#### 6. Multi-transaction step pattern

For steps that have multiple sub-transactions (steps 2, 4, 5, 6), use this pattern:

```typescript
function useSequentialTransactions(transactions: TransactionConfig[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && currentIndex < transactions.length - 1) {
      reset();
      setCurrentIndex(prev => prev + 1);
    }
  }, [isSuccess]);

  const execute = () => {
    const tx = transactions[currentIndex];
    writeContract({ address: tx.address, abi: tx.abi, functionName: tx.functionName, args: tx.args, chainId: CHAIN_ID });
  };

  return { execute, currentIndex, total: transactions.length, isPending, isSuccess: isSuccess && currentIndex === transactions.length - 1, error, reset };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm typecheck`

#### Manual Verification:
- [ ] Each step shows correct on-chain state detection (done/pending)
- [ ] Each step executes its transactions correctly
- [ ] Multi-tx steps show sub-progress
- [ ] Error on any step shows retry button
- [ ] Page refresh after partial completion resumes correctly

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Main Page Assembly & Completion UX

### Overview
Assemble all steps into the main page with proper layout, step unlocking logic, and post-creation success state.

### Changes Required:

#### 1. Rewrite main page

**File**: `packages/web/src/app/yo-treasury/create/page.tsx` (rewrite)

Layout structure:
```
┌─────────────────────────────────────┐
│ Create Treasury Vault               │
│ Deploy a new vault on Base          │
│                                     │
│ ┌─ Step 1: Clone Vault ──────────┐  │
│ │ ✓ Clone Vault — 0x1234...abcd  │  │
│ └────────────────────────────────┘  │
│                                     │
│ ┌─ Step 2: Grant Roles ──────────┐  │
│ │ ● Granting role 3/4...         │  │
│ │ [  Processing...            ]  │  │
│ └────────────────────────────────┘  │
│                                     │
│ ┌─ Step 3: Add Fuses ────────────┐  │
│ │ ○ Add 9 Fuses                  │  │
│ │ [ Add Fuses ]                  │  │
│ └────────────────────────────────┘  │
│ ... (steps 4-6 locked until prev)  │
│                                     │
│ ═══ After all steps complete ═══    │
│                                     │
│ ┌─ Success ──────────────────────┐  │
│ │ ✓ Vault created!               │  │
│ │ 0x1234567890abcdef1234 [Copy]  │  │
│ │ [View Vault Dashboard →]       │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

Key behaviors:
- Steps 2-6 are disabled/dimmed until their prerequisite step is complete
- Each step reads on-chain state on mount (supports resume after refresh)
- After step 1 completes, vault address stored in localStorage
- After all 6 steps complete, show success card with:
  - Vault address with copy-to-clipboard button
  - Link to `/vaults/8453/{vaultAddress}`
  - "Start Fresh" button to create another vault

#### 2. Access Manager address resolution

The vault address is known after step 1, but the AccessManager address is also needed for step 2 (granting roles). Two options:
- **Option A**: Extract from clone tx receipt logs (done in step 1's `onVaultCreated` callback)
- **Option B**: Read from chain: `PlasmaVault.getAccessManagerAddress()`

Use **Option B** for robustness — it works on page refresh. Add a `useReadContract` in step 2 to fetch AccessManager address from the vault.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm typecheck`
- [ ] Storybook builds: `cd packages/web && pnpm build-storybook` (or check via Storybook dev)

#### Manual Verification:
- [ ] Full flow works end-to-end in Storybook: clone → roles → fuses → balance fuses → substrates → deps → success
- [ ] Vault address shown with working copy button
- [ ] Link to vault page works
- [ ] Page refresh mid-flow resumes at correct step
- [ ] Error recovery works (reject tx → retry)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 5: Polish & Error Handling

### Overview
Final polish: better error messages, edge case handling, visual refinement.

### Changes Required:

1. **Error message cleanup**: Extract useful error messages from wagmi errors (strip `ContractFunctionExecutionError` boilerplate, show just the revert reason)
2. **Gas estimation**: If `simulateContract` fails, show the revert reason before user even tries to sign
3. **Wallet not connected**: Show "Connect your wallet" message (already handled by WalletDecorator in Storybook, but add for production)
4. **Wrong chain**: If connected to wrong chain, show chain switch prompt (borrow pattern from `execute-actions.tsx` steps 1-2)
5. **Visual**: Better spacing, card borders, subtle animations on step transitions

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles
- [ ] No ESLint errors

#### Manual Verification:
- [ ] Error messages are readable
- [ ] Wrong chain shows switch prompt
- [ ] Storybook screenshot looks clean and professional

---

## Testing Strategy

### Development Testing (Storybook + Playwright MCP):
- Story at `packages/web/src/app/yo-treasury/create/create-treasury-vault.stories.tsx`
- URL: `http://localhost:6007/iframe.html?globals=&id=yo-treasury-create-treasury-vault--default`
- WalletDecorator auto-connects a real wallet on Base
- Test each step individually, verify on-chain state
- **Important**: Each clone creates a real vault on Base mainnet and costs gas — test sparingly

### Manual Testing Steps:
1. Open Storybook story
2. Click "Clone Vault" → verify wallet prompt, tx confirmation, vault address appears
3. Refresh page → verify step 1 shows as done, step 2 is active
4. Click "Grant Roles" → verify 4 sequential role grants
5. Continue through all 6 steps
6. Verify success state shows vault address with copy button
7. Click vault link → verify navigation

## File Summary

New files:
- `packages/web/src/app/yo-treasury/create/components/step-row.tsx`
- `packages/web/src/app/yo-treasury/create/vault-creation.constants.ts`
- `packages/web/src/app/yo-treasury/create/use-vault-address.ts`
- `packages/web/src/app/yo-treasury/create/steps/clone-vault-step.tsx`
- `packages/web/src/app/yo-treasury/create/steps/grant-roles-step.tsx`
- `packages/web/src/app/yo-treasury/create/steps/add-fuses-step.tsx`
- `packages/web/src/app/yo-treasury/create/steps/add-balance-fuses-step.tsx`
- `packages/web/src/app/yo-treasury/create/steps/configure-substrates-step.tsx`
- `packages/web/src/app/yo-treasury/create/steps/update-deps-step.tsx`

Modified files:
- `packages/web/src/app/yo-treasury/create/page.tsx` (complete rewrite)

Unchanged files:
- `packages/web/src/app/yo-treasury/create/create-treasury-vault.stories.tsx` (no changes needed)
- `packages/sdk/src/markets/yo/create-vault.ts` (reference only, not called from frontend)

## References

- Ticket: `thoughts/kuba/tickets/fsn_0055-vault-creation-ux.md`
- SDK create-vault: `packages/sdk/src/markets/yo/create-vault.ts`
- PlasmaVault class: `packages/sdk/src/PlasmaVault.ts`
- Existing StepRow pattern: `packages/web/src/vault-details/components/execute-actions.tsx:424-460`
- wgenie-webapp transaction item: `wgenie-webapp/src/fusion/setup/configure-vault-access/components/configure-vault-access-transaction-item.tsx`
- YO addresses: `packages/sdk/src/markets/yo/yo.addresses.ts`
- YO constants: `packages/sdk/src/markets/yo/yo.constants.ts`
- Fork tests: `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
