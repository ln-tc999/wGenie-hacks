# YO Treasury Deposit Feature — Implementation Plan

## Overview

Add a deposit form as a right-side column on the YO Treasury tab, following the Morpho/Euler pattern. The main content (chat) stays on the left. The deposit form handles ERC20 approve + ERC4626 deposit into the PlasmaVault. A withdraw placeholder is included for the next session.

**Reference screenshots:**
- `thoughts/kuba/notes/yo-hackathon/screenshots/euler-vault-deposit-ui.png`
- `thoughts/kuba/notes/yo-hackathon/screenshots/morpho-vault-deposit-ui.png`

## Current State Analysis

- YO Treasury tab at `/vaults/[chainId]/[address]/yo` renders only `TreasuryChat` (full width)
- No deposit form exists anywhere in the codebase — this is the first one
- Demo vault on Base: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` with WHITELIST_ROLE granted
- Underlying token: USDC (6 decimals) at `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on Base
- wagmi patterns established in vault creation steps: `useSimulateContract` → `useWriteContract` → `useWaitForTransactionReceipt`
- `plasmaVaultAbi` from `@wgenie/fusion-sdk` includes `deposit(assets_, receiver_)` (standard ERC4626)
- `erc20Abi` from `viem` includes `approve`, `balanceOf`, `allowance`
- `erc4626Abi` from `viem` includes `convertToAssets`, `convertToShares`, `asset`

### Key Discoveries:
- PlasmaVault deposit is standard ERC4626: `approve(vaultAddress, amount)` on USDC, then `deposit(amount, receiver)` on vault (`plasma-vault.abi.ts:610`)
- WHITELIST_ROLE (800n) is required — vault is non-public, only whitelisted addresses can deposit
- Vault creation page uses `erc4626Abi` from viem and inline ABI fragments — same approach for deposit
- The `yo-treasury-tab.tsx` component currently just wraps `TreasuryChat` — needs restructuring for two-column layout
- `useVaultContext()` provides `chainId`, `vaultAddress`, `assetAddress`, `assetDecimals`, `assetSymbol` from the vault detail layout

## Desired End State

The YO Treasury tab shows a two-column layout:
- **Left column** (~65%): TreasuryChat (existing, unchanged)
- **Right column** (~35%): Sticky deposit/withdraw card

The deposit card shows:
1. "Deposit USDC" header with token icon
2. Amount input field with USD value below (like Morpho: `$0`)
3. Wallet USDC balance (clickable "Max" to fill)
4. Current vault position: asset value in USDC + USD (converted from shares, not raw shares)
5. Summary: Deposit amount, current vault position
6. Two-step flow: Approve button (if needed) → Deposit button
7. A "Withdraw" tab placeholder below/beside with "Coming soon"

**Verify by:**
- Navigate to `/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D/yo`
- See two-column layout: chat left, deposit card right
- Deposit card shows wallet USDC balance and vault position
- Can enter amount, approve, and deposit USDC
- After deposit, vault position updates

## What We're NOT Doing

- Withdraw functionality (placeholder only — next session)
- Deposit via AI chat agent (web UI only, per PRD)
- `depositWithPermit` (nice optimization, not needed for hackathon)
- Gas estimation display (adds complexity, low value for demo)
- Multi-token support (USDC only, hardcoded)

## Implementation Approach

Follow the existing vault creation step pattern (wagmi hooks, simulate → write → wait). The deposit form is a single client component with internal state machine: idle → approving → approved → depositing → done. All reads use `useReadContract`/`useReadContracts` from wagmi. Position display uses `erc4626Abi.convertToAssets` to show underlying value, not raw shares.

---

## Phase 1: Deposit Form Component

### Overview
Build the core `DepositForm` component with amount input, balance/position reads, and approve + deposit transaction flow. Also create a `WithdrawPlaceholder` component.

### Changes Required:

#### 1. Deposit Form Component

**File**: `packages/web/src/yo-treasury/components/deposit-form.tsx` (new)

A `'use client'` component that handles the full deposit flow.

**Props:**
```typescript
interface DepositFormProps {
  chainId: number;
  vaultAddress: Address;
}
```

**On-chain reads (wagmi hooks):**
```typescript
// 1. Read vault's underlying asset address + decimals
const { data: assetAddress } = useReadContract({
  chainId,
  address: vaultAddress,
  abi: erc4626Abi,
  functionName: 'asset',
});

// 2. Read user's USDC wallet balance
const { data: walletBalance, refetch: refetchBalance } = useReadContract({
  chainId,
  address: assetAddress,    // USDC
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress!],
  query: { enabled: !!userAddress && !!assetAddress },
});

// 3. Read current allowance
const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
  chainId,
  address: assetAddress,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [userAddress!, vaultAddress],
  query: { enabled: !!userAddress && !!assetAddress },
});

// 4. Read user's vault share balance
const { data: shareBalance } = useReadContract({
  chainId,
  address: vaultAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress!],
  query: { enabled: !!userAddress },
});

// 5. Convert shares to underlying asset value
const { data: positionAssets, refetch: refetchPosition } = useReadContract({
  chainId,
  address: vaultAddress,
  abi: erc4626Abi,
  functionName: 'convertToAssets',
  args: [shareBalance!],
  query: { enabled: shareBalance !== undefined && shareBalance > 0n },
});
```

**Transaction flow:**
```typescript
// Approve step
const { writeContract: writeApprove, data: approveTxHash, isPending: isApproving } = useWriteContract();
const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

// Deposit step
const { writeContract: writeDeposit, data: depositTxHash, isPending: isDepositing } = useWriteContract();
const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositTxHash });

const needsApproval = currentAllowance !== undefined && depositAmount > 0n && currentAllowance < depositAmount;

const handleApprove = () => {
  writeApprove({
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'approve',
    args: [vaultAddress, depositAmount],
    chainId,
  });
};

const handleDeposit = () => {
  writeDeposit({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'deposit',
    args: [depositAmount, userAddress!],
    chainId,
  });
};

// After approve confirms, refetch allowance
useEffect(() => {
  if (isApproveConfirmed) refetchAllowance();
}, [isApproveConfirmed, refetchAllowance]);

// After deposit confirms, refetch balance + position
useEffect(() => {
  if (isDepositConfirmed) {
    refetchBalance();
    refetchAllowance();
    refetchPosition();
    setInputValue('');  // clear input
  }
}, [isDepositConfirmed, ...]);
```

**UI layout (following Morpho pattern):**
```
+----------------------------------+
| Deposit USDC            [USDC]   |
| ┌──────────────────────────────┐ |
| │  0.00                        │ |
| │  $0                          │ |
| └──────────────────────────────┘ |
| Balance: 1,234.56 USDC    [Max] |
|                                  |
| ─────────────────────────────── |
| Deposit (USDC)          100.00  |
| Your Position       $1,234.56   |
| ─────────────────────────────── |
|                                  |
| [ Approve USDC ]  (if needed)   |
|   — or —                         |
| [ Deposit ]        (if approved) |
+----------------------------------+
```

**States:**
- No wallet connected → "Connect Wallet" button (disabled deposit)
- Wallet connected, no balance → show "0.00" balance, button disabled
- Amount entered, needs approval → show "Approve USDC" button
- Approved → show "Deposit" button
- Approving/Depositing → show spinner + "Confirm in wallet..." / "Waiting for confirmation..."
- Deposit confirmed → show success briefly, clear input, refetch balances
- Error → show error message with "Try again" button

**Amount input handling:**
- Parse input string to BigInt using `parseUnits(input, assetDecimals)` from viem
- Show USD value using a hardcoded $1.00 for USDC (acceptable for hackathon — USDC is always ~$1)
- "Max" button fills with full wallet balance
- Validate: amount > 0, amount <= wallet balance

#### 2. Withdraw Placeholder Component

**File**: `packages/web/src/yo-treasury/components/withdraw-placeholder.tsx` (new)

Simple placeholder component for the withdraw feature.

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export function WithdrawPlaceholder() {
  return (
    <Card className="p-4 opacity-60">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span className="text-sm font-medium">Withdraw</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Withdraw from treasury coming soon.
      </p>
    </Card>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Build succeeds: `cd packages/web && pnpm build`
- [ ] `DepositForm` component renders without errors

#### Manual Verification:
- [ ] Component shows wallet USDC balance when connected
- [ ] Component shows current vault position in USDC and USD (not raw shares)
- [ ] Amount input parses correctly and shows USD conversion
- [ ] Max button fills wallet balance
- [ ] Approve button appears when allowance is insufficient
- [ ] Deposit button appears after approval
- [ ] Both transactions execute successfully
- [ ] Balances refresh after deposit

**Implementation Note**: After completing this phase, verify the component works in isolation before integrating into the layout.

---

## Phase 2: Layout Integration

### Overview
Restructure the YO Treasury tab to a two-column layout: chat on the left, deposit card (with withdraw placeholder) on the right. The right column is sticky so it stays visible while scrolling chat.

### Changes Required:

#### 1. Restructure YO Treasury Tab

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx` (modify)

Change from rendering only `TreasuryChat` to a two-column layout:

```typescript
'use client';

import { TreasuryChat } from './treasury-chat';
import { DepositForm } from './deposit-form';
import { WithdrawPlaceholder } from './withdraw-placeholder';
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
    <div className="flex gap-4">
      {/* Left column: Chat */}
      <div className="flex-1 min-w-0">
        <TreasuryChat
          chainId={chainId}
          vaultAddress={vaultAddress}
          callerAddress={address}
        />
      </div>

      {/* Right column: Deposit + Withdraw */}
      <div className="w-80 shrink-0 sticky top-0 self-start space-y-3">
        <DepositForm
          chainId={chainId}
          vaultAddress={vaultAddress}
        />
        <WithdrawPlaceholder />
      </div>
    </div>
  );
}
```

**Key decisions:**
- Right column width: `w-80` (320px) — similar to Morpho's deposit sidebar
- `sticky top-0 self-start` — keeps deposit card visible while chat scrolls
- `min-w-0` on chat column — prevents flex overflow from chat content
- Gap: `gap-4` between columns

#### 2. Adjust TreasuryChat height calculation

**File**: `packages/web/src/yo-treasury/components/treasury-chat.tsx` (minor adjustment if needed)

The current `TreasuryChat` calculates its height to fill the viewport. With the two-column layout, it should still work since it measures from its own container's top. No change expected, but verify.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Build succeeds: `cd packages/web && pnpm build`

#### Manual Verification:
- [ ] Navigate to `/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D/yo`
- [ ] Two-column layout visible: chat left, deposit card right
- [ ] Deposit card is sticky while chat scrolls
- [ ] Chat still works (send messages, tool renderers function)
- [ ] Withdraw placeholder shows below deposit card
- [ ] Layout doesn't break on narrower screens (reasonable degradation)

**Implementation Note**: After completing this phase, do full E2E testing with Playwright MCP.

---

## Phase 3: Testing & Polish

### Overview
End-to-end testing with Playwright MCP on the demo vault. Verify the full deposit flow works.

### Testing Steps:

1. **Navigate** to demo vault YO tab: `http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D/yo`
2. **Screenshot** the two-column layout
3. **Verify** deposit card renders with:
   - "Deposit USDC" header
   - Amount input
   - Wallet balance (or "Connect Wallet" if not connected)
   - Vault position
4. **Verify** withdraw placeholder shows "Coming soon"
5. **Verify** chat still functions alongside the deposit card

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Build succeeds: `cd packages/web && pnpm build`
- [ ] Playwright screenshot confirms two-column layout

#### Manual Verification:
- [ ] Connect wallet on Base
- [ ] Enter deposit amount → Approve → Deposit → balances update
- [ ] Vault position shows USDC value (not raw shares)
- [ ] Chat and deposit card work simultaneously
- [ ] No regressions on other vault tabs

**Implementation Note**: After passing all verifications, this feature is complete. Withdraw implementation deferred to next session.

---

## Testing Strategy

### Manual Testing Steps:
1. Open demo vault YO tab (Base chain)
2. Connect wallet
3. Verify wallet USDC balance displayed
4. Enter amount, click Max, verify fills correctly
5. If allowance insufficient, click Approve, sign in wallet, wait for confirmation
6. Click Deposit, sign in wallet, wait for confirmation
7. Verify wallet balance decreased, vault position increased
8. Verify USD values shown (not raw shares)
9. Send a chat message — verify chat still works alongside deposit form
10. Refresh page — verify position persists (read from chain)

### Playwright MCP:
- Screenshot two-column layout
- Verify deposit card DOM structure
- Verify withdraw placeholder present

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0058-execute-next-step-yo-hackathon.md`
- PRD: `thoughts/kuba/notes/yo-hackathon/project-plan/00-prd.md`
- User stories: `thoughts/kuba/notes/yo-hackathon/project-plan/01-user-stories.md` (US-2.2)
- Architecture: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Euler deposit UI: `thoughts/kuba/notes/yo-hackathon/screenshots/euler-vault-deposit-ui.png`
- Morpho deposit UI: `thoughts/kuba/notes/yo-hackathon/screenshots/morpho-vault-deposit-ui.png`
- Existing wagmi pattern: `packages/web/src/app/yo-treasury/create/steps/clone-vault-step.tsx`
- PlasmaVault deposit ABI: `packages/sdk/src/abi/plasma-vault.abi.ts:610`
- Current YO tab: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`
