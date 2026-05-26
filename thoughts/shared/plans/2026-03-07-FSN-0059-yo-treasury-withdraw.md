# YO Treasury Withdraw Form — Implementation Plan

## Overview

Replace the `WithdrawPlaceholder` with a working `WithdrawForm` component that withdraws USDC from the PlasmaVault using ERC4626 `redeem`. Follows the deposit form pattern but is simpler: no approval step, single transaction.

## Current State Analysis

- Deposit form is done and tested (`deposit-form.tsx`) — the primary pattern to follow
- `WithdrawPlaceholder` at `packages/web/src/yo-treasury/components/withdraw-placeholder.tsx` renders a "coming soon" card
- Already integrated in `yo-treasury-tab.tsx` right column, below `DepositForm`
- Demo vault: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` on Base (8453), has 1 USDC deposited

### Key Discoveries:

- Deposit form (`deposit-form.tsx`) already reads `shareBalance` and `positionAssets` — same reads needed for withdraw
- `erc4626Abi` from viem includes `redeem(shares, receiver, owner)`, `convertToShares(assets)`, `convertToAssets(shares)`
- No approval needed — user redeems their own shares from the vault
- `yo-treasury-tab.tsx:32` renders `<WithdrawPlaceholder />` — swap to `<WithdrawForm>`

## Desired End State

The withdraw card (below deposit) shows:
1. "Withdraw USDC" header with token icon
2. Current vault position in USDC and USD
3. Amount input with Max button (max = full position)
4. Single-step tx: `redeem(shares, userAddress, userAddress)`
5. Success/error states, balances refetch after withdraw

**Verify by:**
- Open Storybook story for WithdrawForm
- Connect wallet on Base
- Enter amount or click Max
- Execute withdraw — position decreases, wallet balance increases

## What We're NOT Doing

- Withdrawing allocated funds from YO vaults (agent's job via YoRedeemFuse)
- Two-step withdraw (request + claim) — PlasmaVault allows instant redeem for unallocated funds
- `withdraw(assets, receiver, owner)` path — using `redeem` only to avoid rounding issues
- Slippage protection UI — not needed for hackathon demo

## Implementation Approach

Mirror the deposit form structure but remove the approval step. Use `redeem` (share-denominated) exclusively:
- Partial withdraw: convert USDC input → shares via `convertToShares`, then `redeem(shares, user, user)`
- Max withdraw: `redeem(shareBalance, user, user)` — uses raw share balance, no conversion rounding

Track `isMax` boolean state to differentiate these paths.

---

## Phase 1: WithdrawForm Component + Integration

### Overview

Build the `WithdrawForm` component and wire it into `yo-treasury-tab.tsx`.

### Changes Required:

#### 1. WithdrawForm Component

**File**: `packages/web/src/yo-treasury/components/withdraw-form.tsx` (new)

**Props:**
```typescript
interface Props {
  chainId: number;
  vaultAddress: Address;
}
```

**On-chain reads:**
```typescript
// Same as deposit: asset address, decimals, symbol
const { data: assetAddress } = useReadContract({
  chainId, address: vaultAddress, abi: erc4626Abi, functionName: 'asset',
});
const { data: assetDecimals } = useReadContract({
  chainId, address: assetAddress!, abi: erc20Abi, functionName: 'decimals',
  query: { enabled: !!assetAddress },
});
const { data: assetSymbol } = useReadContract({
  chainId, address: assetAddress!, abi: erc20Abi, functionName: 'symbol',
  query: { enabled: !!assetAddress },
});

// User's vault share balance
const { data: shareBalance, refetch: refetchShares } = useReadContract({
  chainId, address: vaultAddress, abi: erc20Abi, functionName: 'balanceOf',
  args: [userAddress!],
  query: { enabled: !!userAddress },
});

// Convert shares → underlying USDC (for position display)
const { data: positionAssets, refetch: refetchPosition } = useReadContract({
  chainId, address: vaultAddress, abi: erc4626Abi, functionName: 'convertToAssets',
  args: [shareBalance!],
  query: { enabled: shareBalance !== undefined && shareBalance > 0n },
});

// Convert input USDC → shares (for partial redeem only)
const { data: sharesToRedeem } = useReadContract({
  chainId, address: vaultAddress, abi: erc4626Abi, functionName: 'convertToShares',
  args: [withdrawAmount],
  query: { enabled: withdrawAmount > 0n && !isMax },
});

// User's wallet USDC balance (for display after withdraw)
const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
  chainId, address: assetAddress!, abi: erc20Abi, functionName: 'balanceOf',
  args: [userAddress!],
  query: { enabled: !!userAddress && !!assetAddress },
});
```

**Key state:**
```typescript
const [inputValue, setInputValue] = useState('');
const [isMax, setIsMax] = useState(false);
const [showSuccess, setShowSuccess] = useState(false);
```

**Max handler:**
```typescript
const handleMax = useCallback(() => {
  if (positionAssets !== undefined) {
    setInputValue(formatUnits(positionAssets, decimals));
    setIsMax(true);
  }
}, [positionAssets, decimals]);
```

**Input handler — clears isMax:**
```typescript
onChange={(e) => {
  const v = e.target.value;
  if (v === '' || /^\d*\.?\d*$/.test(v)) {
    setInputValue(v);
    setIsMax(false);
  }
}}
```

**Redeem transaction:**
```typescript
const {
  writeContract: writeRedeem,
  data: redeemTxHash,
  isPending: isRedeeming,
  error: redeemError,
  reset: resetRedeem,
} = useWriteContract();

const { isLoading: isRedeemConfirming, isSuccess: isRedeemConfirmed } =
  useWaitForTransactionReceipt({ hash: redeemTxHash });

const handleRedeem = useCallback(() => {
  if (!userAddress) return;
  const shares = isMax ? shareBalance! : sharesToRedeem!;
  writeRedeem({
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'redeem',
    args: [shares, userAddress, userAddress],
    chainId,
  });
}, [vaultAddress, userAddress, chainId, isMax, shareBalance, sharesToRedeem, writeRedeem]);
```

**Post-redeem effect:**
```typescript
useEffect(() => {
  if (isRedeemConfirmed) {
    refetchShares();
    refetchPosition();
    refetchWalletBalance();
    resetRedeem();
    setInputValue('');
    setIsMax(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }
}, [isRedeemConfirmed, refetchShares, refetchPosition, refetchWalletBalance, resetRedeem]);
```

**Button logic (simpler than deposit — no approval step):**
```typescript
const isBusy = isRedeeming || isRedeemConfirming;

const hasEnoughPosition =
  positionAssets !== undefined && withdrawAmount > 0n && withdrawAmount <= positionAssets;

const sharesReady = isMax ? shareBalance !== undefined && shareBalance > 0n : sharesToRedeem !== undefined && sharesToRedeem > 0n;

const buttonLabel = (() => {
  if (!userAddress) return 'Connect Wallet';
  if (isRedeeming) return 'Confirm in wallet...';
  if (isRedeemConfirming) return 'Withdrawing...';
  if (parseError) return 'Invalid amount';
  if (withdrawAmount === 0n) return 'Enter amount';
  if (!hasEnoughPosition) return 'Exceeds position';
  return 'Withdraw';
})();

const buttonDisabled =
  !userAddress || withdrawAmount === 0n || parseError || !hasEnoughPosition || !sharesReady || isBusy;
```

**UI layout (mirrors deposit form):**
```
+----------------------------------+
| Withdraw USDC           [USDC]   |
| ┌──────────────────────────────┐ |
| │  0.00                        │ |
| │  $0                          │ |
| └──────────────────────────────┘ |
| Position: 1.00 USDC       [Max] |
|                                  |
| ─────────────────────────────── |
| Your Position        $1.00      |
| ─────────────────────────────── |
|                                  |
| [ Withdraw ]                     |
+----------------------------------+
```

#### 2. Update yo-treasury-tab.tsx

**File**: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx` (modify)

Replace `WithdrawPlaceholder` import and usage with `WithdrawForm`:

```typescript
import { WithdrawForm } from './withdraw-form';
// Remove: import { WithdrawPlaceholder } from './withdraw-placeholder';

// In JSX, replace:
//   <WithdrawPlaceholder />
// With:
//   <WithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Build succeeds: `cd packages/web && pnpm build`
- [ ] `withdraw-form.tsx` exists with correct exports

#### Manual Verification:
- [ ] Component shows vault position in USDC when wallet connected
- [ ] Amount input parses correctly and shows USD conversion
- [ ] Max button fills with full position value and sets isMax flag
- [ ] Withdraw button executes `redeem` transaction
- [ ] After confirm: position decreases, wallet balance increases, input clears, success banner shows
- [ ] Error state shows message with "Try again" button
- [ ] "Exceeds position" shown when input > position

**Implementation Note**: After completing this phase, verify via Storybook before E2E testing.

---

## Phase 2: Storybook Story + E2E Testing

### Overview

Add a Storybook story following the deposit-form pattern, then test E2E in Storybook.

### Changes Required:

#### 1. Storybook Story

**File**: `packages/web/src/yo-treasury/components/withdraw-form.stories.tsx` (new)

Mirror `deposit-form.stories.tsx` exactly:

```typescript
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { Decorator } from '@storybook/react';
import { useSwitchChain } from 'wagmi';
import { WalletDecorator } from '@/app/wallet.decorator';
import { WithdrawForm } from './withdraw-form';

const SwitchToBase: Decorator = (Story) => {
  const { switchChain } = useSwitchChain();
  useEffect(() => {
    switchChain({ chainId: 8453 });
  }, [switchChain]);
  return <Story />;
};

const meta: Meta<typeof WithdrawForm> = {
  title: 'YO Treasury / Withdraw Form',
  component: WithdrawForm,
  decorators: [SwitchToBase, WalletDecorator],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof WithdrawForm>;

export const Base: Story = {
  args: {
    chainId: 8453,
    vaultAddress: '0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D',
  },
};
```

#### 2. E2E Testing Steps

Using Playwright MCP against Storybook:

1. Navigate to the WithdrawForm story in Storybook
2. Screenshot initial state — should show position and empty input
3. Click Max — input fills with position amount
4. Click Withdraw — confirm in wallet
5. Screenshot success state — position should decrease
6. Verify wallet USDC balance increased

### Success Criteria:

#### Automated Verification:
- [ ] Storybook builds: `cd packages/web && pnpm storybook --smoke-test` (or just verify it loads)
- [ ] Story renders without errors in browser

#### Manual Verification:
- [ ] Story shows in Storybook sidebar under "YO Treasury / Withdraw Form"
- [ ] Connected wallet shows vault position
- [ ] Max button fills input correctly
- [ ] Withdraw transaction executes successfully
- [ ] Balances update after withdraw
- [ ] The 1 USDC in demo vault can be withdrawn

**Implementation Note**: After E2E testing confirms withdraw works, update the progress tracker.

---

## Testing Strategy

### Unit/Component Tests:
- Not in scope for hackathon — rely on E2E testing via Storybook

### E2E Testing (Storybook + Playwright MCP):
1. Open WithdrawForm story
2. Verify position display shows deposited USDC
3. Click Max, verify input fills
4. Execute withdraw, verify success
5. Verify balances update

### Manual Testing Steps:
1. Navigate to demo vault YO tab
2. Verify withdraw card appears below deposit card
3. Position shows USDC value (not raw shares)
4. Enter amount or click Max
5. Click Withdraw, sign in wallet
6. Verify: position decreases, wallet balance increases
7. Success banner appears briefly
8. Input clears after success

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0059-yo-treasury-withdraw.md`
- Deposit form (pattern): `packages/web/src/yo-treasury/components/deposit-form.tsx`
- Deposit story (pattern): `packages/web/src/yo-treasury/components/deposit-form.stories.tsx`
- Deposit plan: `thoughts/shared/plans/2026-03-07-FSN-0058-yo-treasury-deposit.md`
- Withdraw placeholder: `packages/web/src/yo-treasury/components/withdraw-placeholder.tsx`
- YO Treasury tab: `packages/web/src/yo-treasury/components/yo-treasury-tab.tsx`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
