# FSN-0070: YO Vault Deposit/Withdraw with @yo-protocol/react Hooks

## Overview

Replace the generic wagmi-based `VaultActionTabs` sidebar on `yo-vault` tagged pages with new components powered by `@yo-protocol/react` hooks (`useDeposit`, `useRedeem`). The new forms use the YO dark theme (neon #D6FF34 on black, Space Grotesk), show step-by-step transaction progress, and fully support queued redemptions with pending status display.

## Current State Analysis

- **Generic sidebar**: `vault-detail-layout.tsx:41` always renders `VaultActionTabs` regardless of vault tags
- **Raw wagmi**: `vault-actions/components/deposit-form.tsx` and `withdraw-form.tsx` use `useWriteContract` directly against ERC4626 — bypasses the YO Gateway (no approval batching, slippage protection, or cross-chain routing)
- **No SDK installed**: `@yo-protocol/react` is not in `packages/web/package.json` (only `@yo-protocol/core`)
- **No `YieldProvider`**: `app-providers.tsx` has only `QueryClientProvider` + `WagmiProvider`
- **Tag info not passed to layout**: `layout.tsx:29` has vault tags from registry but doesn't forward them to `VaultDetailLayout`
- **4 yo-vault vaults**: yoUSD, yoETH, yoBTC, yoEUR — all on Base (8453)

### Key Discoveries:

- `VaultDetailLayout` (`vault-detail-layout.tsx:18-49`) renders sidebar at `w-full lg:w-[380px]` sticky position — this width is the constraint for new forms
- The `.yo` theme scope is applied in `yo-vault-overview.tsx:19` via `className="font-yo"` — we should apply the same on the sidebar when it's a yo-vault
- YO design tokens are already registered in `global.css:76-155` (`.yo` scope + `@theme inline`)
- `useDeposit` returns a `step` field: `'idle' | 'switching-chain' | 'approving' | 'depositing' | 'waiting' | 'success' | 'error'`
- `useRedeem` returns `instant: boolean | undefined` and `assetsOrRequestId: string | undefined` for queued redemption support
- `usePendingRedemptions(vault, user?)` returns `{ pendingRedemptions: PendingRedeem | undefined }` with `assets?: FormattedValue` and `shares?: FormattedValue`

## Desired End State

YO vault detail pages (`yo-vault` tag) render a **YO-themed deposit/withdraw sidebar** that:

1. Uses `@yo-protocol/react` hooks for all transactions (gateway-routed, batched approvals)
2. Shows visual step progress during multi-step flows (chain switch → approve → deposit/redeem → confirmation)
3. Displays pending/queued redemption status when a withdrawal is not instant
4. Uses the YO dark aesthetic with neon accents, matching the vault overview section below
5. Partner ID is configurable via `NEXT_PUBLIC_YO_PARTNER_ID` env var
6. `YieldProvider` is scoped to yo-vault pages only (not global)

### Verification:

- Navigate to any yo-vault page (e.g., `/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65`)
- Sidebar should render YO-themed deposit/withdraw tabs (not the generic white Card forms)
- Deposit flow: enter amount → click Deposit → see step indicators (approving → depositing → waiting → success)
- Withdraw flow: enter amount → click Withdraw → see instant vs queued outcome
- Non-yo-vault pages should still render the generic `VaultActionTabs` unchanged

## What We're NOT Doing

- Not modifying the generic `VaultActionTabs` or its forms — they remain for non-YO vaults
- Not adding `YieldProvider` globally to `AppProviders` — scoped to yo-vault layout only
- Not changing the yo-treasury page (it has its own separate forms)
- Not implementing cross-chain deposits (all 4 yo-vaults are on Base) — but `useDeposit` handles chain switching automatically if needed in the future
- Not removing the existing `yo-treasury/components/deposit-form.tsx` and `withdraw-form.tsx` (they're used by Storybook stories)

## Implementation Approach

The cleanest integration point is `vault-detail-layout.tsx`. We pass an `isYoVault` boolean from the server `layout.tsx`, and conditionally render a new `YoVaultSidebar` component (which wraps `YieldProvider` + `YoVaultActionTabs`) instead of the generic `VaultActionTabs`.

New components go in `packages/web/src/yo-vault-actions/` to keep them separate from both the generic `vault-actions/` and the treasury-specific `yo-treasury/`.

---

## Phase 1: Setup & Plumbing

### Overview

Install `@yo-protocol/react`, add env var, pass `isYoVault` flag through the layout layer, and conditionally render the YO sidebar wrapper.

### Changes Required:

#### 1. Install @yo-protocol/react

```bash
cd packages/web && pnpm add @yo-protocol/react
```

#### 2. Add env var

**File**: `packages/web/.env.example`
**Changes**: Add `NEXT_PUBLIC_YO_PARTNER_ID` section

```env
# =============================================================================
# YO Protocol — Partner attribution (get yours at https://docs.yo.xyz/integrations/build-with-yo)
# =============================================================================
NEXT_PUBLIC_YO_PARTNER_ID=9999
```

Also add to `packages/web/.env` with value `9999` (placeholder until real partner ID is obtained).

#### 3. Pass isYoVault from server layout

**File**: `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx`
**Changes**: Compute `isYoVault` from vault tags and pass to `VaultDetailLayout`

```tsx
const isYoVault = vault?.tags.includes('yo-vault') ?? false;

return (
  <VaultDetailLayout
    chainId={chainId as ChainId}
    vaultAddress={vaultAddress}
    vaultName={vault?.name}
    protocol={vault?.protocol}
    isYoVault={isYoVault}
  >
    {children}
  </VaultDetailLayout>
);
```

#### 4. Conditionally render sidebar

**File**: `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx`
**Changes**: Accept `isYoVault` prop, import and render `YoVaultSidebar` when true

```tsx
import { YoVaultSidebar } from '@/yo-vault-actions/components/yo-vault-sidebar';

interface Props {
  children: React.ReactNode;
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
  isYoVault?: boolean;
}

// In the sidebar slot:
{isYoVault ? (
  <YoVaultSidebar chainId={chainId} vaultAddress={vaultAddress} />
) : (
  <VaultActionTabs chainId={chainId} vaultAddress={vaultAddress} />
)}
```

#### 5. Create YoVaultSidebar wrapper (scoped YieldProvider)

**File**: `packages/web/src/yo-vault-actions/components/yo-vault-sidebar.tsx` (new)
**Purpose**: Wraps `YieldProvider` around the YO action tabs — scoped provider, not global

```tsx
'use client';

import { YieldProvider } from '@yo-protocol/react';
import { YoVaultActionTabs } from './yo-vault-action-tabs';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

const PARTNER_ID = Number(process.env.NEXT_PUBLIC_YO_PARTNER_ID) || 9999;

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoVaultSidebar({ chainId, vaultAddress }: Props) {
  return (
    <YieldProvider partnerId={PARTNER_ID} defaultSlippageBps={50}>
      <YoVaultActionTabs chainId={chainId} vaultAddress={vaultAddress} />
    </YieldProvider>
  );
}
```

#### 6. Create placeholder YoVaultActionTabs

**File**: `packages/web/src/yo-vault-actions/components/yo-vault-action-tabs.tsx` (new)
**Purpose**: Tab switcher shell — renders YO-themed tabs, delegates to deposit/withdraw forms

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

type Tab = 'deposit' | 'withdraw';

export function YoVaultActionTabs({ chainId, vaultAddress }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');

  return (
    <div className="font-yo">
      <div className="flex border-b border-white/10 mb-4">
        {(['deposit', 'withdraw'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 pb-2.5 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-yo-neon text-white'
                : 'text-yo-muted hover:text-white',
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'deposit' ? (
        <div className="text-yo-muted text-sm">Deposit form placeholder</div>
      ) : (
        <div className="text-yo-muted text-sm">Withdraw form placeholder</div>
      )}
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:

- [ ] `cd packages/web && pnpm install` completes — `@yo-protocol/react` is in `node_modules`
- [ ] `pnpm --filter web build` compiles without errors (or `pnpm --filter web typecheck`)
- [ ] `NEXT_PUBLIC_YO_PARTNER_ID` is in `.env.example`

#### Manual Verification:

- [ ] Navigate to a yo-vault page (e.g., yoUSD: `/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65`) — see YO-themed tab bar with placeholder text instead of generic Card forms
- [ ] Navigate to a non-yo-vault page — see the generic `VaultActionTabs` unchanged
- [ ] No console errors about missing providers

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: YO Deposit Form

### Overview

Create the deposit form using `useDeposit`, `useVaultState`, `useTokenBalance`, and `useUserPosition` hooks from `@yo-protocol/react`. Features a step progress indicator and YO dark theme.

### Changes Required:

#### 1. Step Progress Indicator component

**File**: `packages/web/src/yo-vault-actions/components/step-progress.tsx` (new)
**Purpose**: Visual step tracker showing the multi-step transaction lifecycle

Design: horizontal pill-based stepper with neon accent for active/completed steps.

```tsx
'use client';

import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface Step {
  key: string;
  label: string;
}

interface Props {
  steps: Step[];
  currentStep: string;
  isError?: boolean;
}

export function StepProgress({ steps, currentStep, isError }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1.5 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300',
                  isCompleted && 'bg-yo-neon text-black',
                  isActive && !isError && 'bg-yo-neon/20 text-yo-neon ring-1 ring-yo-neon',
                  isActive && isError && 'bg-red-500/20 text-red-400 ring-1 ring-red-500',
                  isPending && 'bg-white/5 text-yo-muted',
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : isActive && !isError ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight text-center',
                  isCompleted && 'text-yo-neon',
                  isActive && !isError && 'text-white',
                  isActive && isError && 'text-red-400',
                  isPending && 'text-yo-muted',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mt-[-14px]',
                  isCompleted ? 'bg-yo-neon' : 'bg-white/10',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### 2. YO Deposit Form

**File**: `packages/web/src/yo-vault-actions/components/yo-deposit-form.tsx` (new)
**Purpose**: Deposit form using `useDeposit` hook from `@yo-protocol/react`

Key differences from the generic form:
- Uses `useDeposit` (handles approve + deposit in one flow, chain switching)
- Uses `useVaultState` for vault metadata (name, symbol, decimals, asset address)
- Uses `useTokenBalance` for wallet balance
- Uses `useUserPosition` for current position
- Shows `StepProgress` during active transactions
- YO dark theme with neon accents

```tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import {
  useDeposit,
  useVaultState,
  useTokenBalance,
  useUserPosition,
  usePreviewDeposit,
} from '@yo-protocol/react';
import { formatUnits, parseUnits, type Address } from 'viem';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { TokenIcon } from '@/components/token-icon';
import { StepProgress } from './step-progress';

interface Props {
  chainId: number;
  vaultAddress: Address;
}

const DEPOSIT_STEPS = [
  { key: 'switching-chain', label: 'Switch' },
  { key: 'approving', label: 'Approve' },
  { key: 'depositing', label: 'Deposit' },
  { key: 'waiting', label: 'Confirm' },
];

export function YoDepositForm({ chainId, vaultAddress }: Props) {
  const { address: rawUserAddress, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [inputValue, setInputValue] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const userAddress = mounted ? rawUserAddress : undefined;
  const isWrongChain = !!userAddress && chain?.id !== chainId;

  // ─── YO Protocol hooks ───

  const { vaultState } = useVaultState(vaultAddress);
  const assetAddress = vaultState?.asset;
  const decimals = vaultState?.assetDecimals ?? 6;
  const symbol = vaultState?.symbol ?? '...';

  const { balance: tokenBalance } = useTokenBalance(assetAddress, userAddress);
  const walletBalance = tokenBalance?.raw !== undefined ? BigInt(tokenBalance.raw) : undefined;

  const { position } = useUserPosition(vaultAddress, userAddress);

  // ─── Derived values ───

  let depositAmount = 0n;
  let parseError = false;
  if (inputValue && inputValue !== '0') {
    try {
      depositAmount = parseUnits(inputValue, decimals);
    } catch {
      parseError = true;
    }
  }

  const { shares: previewShares } = usePreviewDeposit(
    vaultAddress,
    depositAmount > 0n ? depositAmount : undefined,
  );

  const walletFormatted =
    walletBalance !== undefined ? formatUnits(walletBalance, decimals) : undefined;

  const hasEnoughBalance =
    walletBalance !== undefined && depositAmount > 0n && depositAmount <= walletBalance;

  // ─── Deposit action ───

  const {
    deposit,
    step,
    isLoading,
    isError,
    error,
    isSuccess,
    reset,
  } = useDeposit({
    vault: vaultAddress,
    onConfirmed: () => {
      setInputValue('');
    },
  });

  const isActive = step !== 'idle' && step !== 'success' && step !== 'error';

  // ─── Handlers ───

  const handleDeposit = useCallback(async () => {
    if (!assetAddress || depositAmount === 0n) return;
    await deposit({ token: assetAddress, amount: depositAmount, chainId });
  }, [assetAddress, depositAmount, chainId, deposit]);

  const handleMax = useCallback(() => {
    if (walletBalance !== undefined) {
      setInputValue(formatUnits(walletBalance, decimals));
    }
  }, [walletBalance, decimals]);

  // ─── Button state ───

  const buttonLabel = (() => {
    if (!userAddress) return 'Connect Wallet';
    if (isActive) return 'Processing...';
    if (parseError) return 'Invalid amount';
    if (depositAmount === 0n) return 'Enter amount';
    if (!hasEnoughBalance) return 'Insufficient balance';
    return 'Deposit';
  })();

  const buttonDisabled =
    !userAddress || depositAmount === 0n || parseError || !hasEnoughBalance || isActive;

  // ─── Format helpers ───

  const formatNum = (val: string | number) =>
    Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 });

  const positionFormatted =
    position?.assets !== undefined
      ? formatUnits(position.assets, decimals)
      : undefined;

  // ─── Render ───

  return (
    <div className="space-y-4">
      {/* Amount input */}
      <div className="bg-yo-dark rounded-xl p-4 border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider uppercase text-yo-muted">
            You deposit
          </span>
          {assetAddress && (
            <div className="flex items-center gap-1.5">
              <TokenIcon chainId={chainId} address={assetAddress} className="w-4 h-4" />
              <span className="text-xs font-medium text-white">{symbol}</span>
            </div>
          )}
        </div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d*$/.test(v)) setInputValue(v);
          }}
          disabled={isActive}
          className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-white/20"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-yo-muted">
            {walletFormatted !== undefined
              ? `Balance: ${formatNum(walletFormatted)}`
              : 'Balance: ...'}
          </span>
          <button
            type="button"
            onClick={handleMax}
            disabled={isActive || !walletBalance}
            className="text-[10px] font-semibold tracking-wider uppercase text-yo-neon hover:text-yo-neon/80 disabled:text-yo-muted disabled:cursor-not-allowed transition-colors"
          >
            Max
          </button>
        </div>
      </div>

      {/* Preview */}
      {depositAmount > 0n && previewShares !== undefined && (
        <div className="bg-yo-dark rounded-xl p-3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-yo-muted">You receive (est.)</span>
            <span className="text-white font-mono">
              {formatNum(formatUnits(previewShares, vaultState?.decimals ?? 18))}{' '}
              <span className="text-yo-muted">{vaultState?.name ?? 'shares'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Position */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-yo-muted">Your position</span>
        <span className="text-white font-mono">
          {positionFormatted !== undefined ? `${formatNum(positionFormatted)} ${symbol}` : '-'}
        </span>
      </div>

      {/* Step progress (visible during active flow) */}
      {isActive && (
        <div className="bg-yo-dark rounded-xl p-3 border border-white/5">
          <StepProgress steps={DEPOSIT_STEPS} currentStep={step} />
        </div>
      )}

      {/* Success */}
      {isSuccess && (
        <div className="bg-yo-neon/10 rounded-xl p-3 border border-yo-neon/20 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-yo-neon shrink-0" />
          <span className="text-xs text-yo-neon font-medium">Deposit successful!</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-[10px] text-yo-neon/60 hover:text-yo-neon"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {isError && error && (
        <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 space-y-1.5">
          <p className="text-xs text-red-400">{error.message.slice(0, 150)}</p>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-red-400/60 hover:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* CTA */}
      {isWrongChain ? (
        <button
          onClick={() => switchChain({ chainId })}
          disabled={isSwitching}
          className="w-full py-3 rounded-xl font-medium text-sm bg-yo-dark text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSwitching && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSwitching ? 'Switching...' : 'Switch Network'}
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={buttonDisabled}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-yo-neon text-black hover:brightness-110 transition-all disabled:opacity-40 disabled:hover:brightness-100 flex items-center justify-center gap-2"
        >
          {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
          {buttonLabel}
          {!buttonDisabled && !isActive && <ArrowRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
```

#### 3. Wire deposit form into tabs

**File**: `packages/web/src/yo-vault-actions/components/yo-vault-action-tabs.tsx`
**Changes**: Import and render `YoDepositForm` in the deposit tab

```tsx
import { YoDepositForm } from './yo-deposit-form';

// In the deposit tab:
{activeTab === 'deposit' ? (
  <YoDepositForm chainId={chainId} vaultAddress={vaultAddress} />
) : (
  <div className="text-yo-muted text-sm">Withdraw form placeholder</div>
)}
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` compiles without errors

#### Manual Verification:

- [ ] Navigate to yoUSD page — sidebar shows YO-themed deposit form with dark background, neon accents
- [ ] Enter an amount — see preview of shares to receive
- [ ] Click Deposit — step progress appears (Approve → Deposit → Confirm)
- [ ] After wallet confirmation — steps animate through completion
- [ ] On success — green neon success banner with dismiss button
- [ ] On error — red error banner with "Try again" button
- [ ] Max button fills wallet balance
- [ ] Position display updates after successful deposit

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: YO Withdraw Form

### Overview

Create the withdraw form using `useRedeem` hook with full support for instant vs queued redemptions, plus a `usePendingRedemptions` banner showing any existing pending redeems.

### Changes Required:

#### 1. Pending Redemption Banner

**File**: `packages/web/src/yo-vault-actions/components/pending-redemption-banner.tsx` (new)
**Purpose**: Show pending queued redemption status if one exists for this user+vault

```tsx
'use client';

import { usePendingRedemptions } from '@yo-protocol/react';
import { Clock } from 'lucide-react';
import type { Address } from 'viem';

interface Props {
  vaultAddress: Address;
}

export function PendingRedemptionBanner({ vaultAddress }: Props) {
  const { pendingRedemptions, isLoading } = usePendingRedemptions(vaultAddress);

  if (isLoading || !pendingRedemptions) return null;

  const hasAssets = pendingRedemptions.assets && Number(pendingRedemptions.assets.raw) > 0;
  const hasShares = pendingRedemptions.shares && Number(pendingRedemptions.shares.raw) > 0;

  if (!hasAssets && !hasShares) return null;

  return (
    <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20 space-y-1.5">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="text-xs font-medium text-yellow-400">Pending Redemption</span>
      </div>
      <div className="space-y-0.5 pl-5.5">
        {hasAssets && (
          <p className="text-[11px] text-yellow-400/80 font-mono">
            {pendingRedemptions.assets!.formatted} assets queued
          </p>
        )}
        {hasShares && (
          <p className="text-[11px] text-yellow-400/80 font-mono">
            {pendingRedemptions.shares!.formatted} shares queued
          </p>
        )}
      </div>
    </div>
  );
}
```

#### 2. YO Withdraw Form

**File**: `packages/web/src/yo-vault-actions/components/yo-withdraw-form.tsx` (new)
**Purpose**: Withdraw form using `useRedeem` hook with instant/queued handling

Key differences from the generic form:
- Uses `useRedeem` (handles share approval + redeem in one flow)
- Converts user-entered asset amount → shares via `usePreviewRedeem`
- Shows `StepProgress` during active transactions
- After redeem completes, shows instant vs queued outcome
- `PendingRedemptionBanner` at the top if user has an existing queued redeem

```tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import {
  useRedeem,
  useVaultState,
  useUserPosition,
  useShareBalance,
  usePreviewRedeem,
} from '@yo-protocol/react';
import { formatUnits, parseUnits, type Address } from 'viem';
import { Loader2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { TokenIcon } from '@/components/token-icon';
import { StepProgress } from './step-progress';
import { PendingRedemptionBanner } from './pending-redemption-banner';

interface Props {
  chainId: number;
  vaultAddress: Address;
}

const REDEEM_STEPS = [
  { key: 'approving', label: 'Approve' },
  { key: 'redeeming', label: 'Redeem' },
  { key: 'waiting', label: 'Confirm' },
];

export function YoWithdrawForm({ chainId, vaultAddress }: Props) {
  const { address: rawUserAddress, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [inputValue, setInputValue] = useState('');
  const [isMax, setIsMax] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const userAddress = mounted ? rawUserAddress : undefined;
  const isWrongChain = !!userAddress && chain?.id !== chainId;

  // ─── YO Protocol hooks ───

  const { vaultState } = useVaultState(vaultAddress);
  const decimals = vaultState?.assetDecimals ?? 6;
  const vaultDecimals = vaultState?.decimals ?? 18;
  const symbol = vaultState?.symbol ?? '...';
  const assetAddress = vaultState?.asset;

  const { position } = useUserPosition(vaultAddress, userAddress);
  const { shares: currentShares } = useShareBalance(vaultAddress, userAddress);

  // ─── Derived values ───

  let withdrawAmount = 0n;
  let parseError = false;
  if (inputValue && inputValue !== '0') {
    try {
      withdrawAmount = parseUnits(inputValue, decimals);
    } catch {
      parseError = true;
    }
  }

  const positionAssets = position?.assets;
  const hasEnoughPosition =
    positionAssets !== undefined && withdrawAmount > 0n && withdrawAmount <= positionAssets;

  // Convert asset amount → shares for the redeem call
  // For max: use all shares directly. For partial: preview the conversion.
  const { assets: previewAssets } = usePreviewRedeem(
    vaultAddress,
    !isMax && currentShares !== undefined && withdrawAmount > 0n
      ? // Approximate: (withdrawAmount / positionAssets) * currentShares
        positionAssets && positionAssets > 0n
          ? (withdrawAmount * currentShares) / positionAssets
          : undefined
      : undefined,
  );

  // Shares to redeem
  const sharesToRedeem = isMax
    ? currentShares
    : positionAssets && positionAssets > 0n && currentShares
      ? (withdrawAmount * currentShares) / positionAssets
      : undefined;

  const sharesReady = sharesToRedeem !== undefined && sharesToRedeem > 0n;

  // ─── Redeem action ───

  const {
    redeem,
    step,
    isLoading,
    isError,
    error,
    isSuccess,
    instant,
    assetsOrRequestId,
    reset,
  } = useRedeem({
    vault: vaultAddress,
    onConfirmed: () => {
      setInputValue('');
      setIsMax(false);
    },
  });

  const isActive = step !== 'idle' && step !== 'success' && step !== 'error';

  // ─── Handlers ───

  const handleRedeem = useCallback(async () => {
    if (!sharesToRedeem || sharesToRedeem === 0n) return;
    await redeem(sharesToRedeem);
  }, [sharesToRedeem, redeem]);

  const handleMax = useCallback(() => {
    if (positionAssets !== undefined) {
      setInputValue(formatUnits(positionAssets, decimals));
      setIsMax(true);
    }
  }, [positionAssets, decimals]);

  // ─── Button state ───

  const buttonLabel = (() => {
    if (!userAddress) return 'Connect Wallet';
    if (isActive) return 'Processing...';
    if (parseError) return 'Invalid amount';
    if (withdrawAmount === 0n) return 'Enter amount';
    if (!hasEnoughPosition) return 'Exceeds position';
    return 'Withdraw';
  })();

  const buttonDisabled =
    !userAddress ||
    withdrawAmount === 0n ||
    parseError ||
    !hasEnoughPosition ||
    !sharesReady ||
    isActive;

  const formatNum = (val: string | number) =>
    Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 });

  const positionFormatted =
    positionAssets !== undefined ? formatUnits(positionAssets, decimals) : undefined;

  // ─── Render ───

  return (
    <div className="space-y-4">
      {/* Pending redemption banner */}
      {userAddress && <PendingRedemptionBanner vaultAddress={vaultAddress} />}

      {/* Amount input */}
      <div className="bg-yo-dark rounded-xl p-4 border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider uppercase text-yo-muted">
            You withdraw
          </span>
          {assetAddress && (
            <div className="flex items-center gap-1.5">
              <TokenIcon chainId={chainId} address={assetAddress} className="w-4 h-4" />
              <span className="text-xs font-medium text-white">{symbol}</span>
            </div>
          )}
        </div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d*$/.test(v)) {
              setInputValue(v);
              setIsMax(false);
            }
          }}
          disabled={isActive}
          className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-white/20"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-yo-muted">
            {positionFormatted !== undefined
              ? `Position: ${formatNum(positionFormatted)}`
              : 'Position: ...'}
          </span>
          <button
            type="button"
            onClick={handleMax}
            disabled={isActive || !positionAssets || positionAssets === 0n}
            className="text-[10px] font-semibold tracking-wider uppercase text-yo-neon hover:text-yo-neon/80 disabled:text-yo-muted disabled:cursor-not-allowed transition-colors"
          >
            Max
          </button>
        </div>
      </div>

      {/* Shares info */}
      {sharesToRedeem && sharesToRedeem > 0n && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-yo-muted">Shares to redeem</span>
          <span className="text-white font-mono">
            {formatNum(formatUnits(sharesToRedeem, vaultDecimals))}
          </span>
        </div>
      )}

      {/* Step progress */}
      {isActive && (
        <div className="bg-yo-dark rounded-xl p-3 border border-white/5">
          <StepProgress steps={REDEEM_STEPS} currentStep={step} />
        </div>
      )}

      {/* Success — instant */}
      {isSuccess && instant === true && (
        <div className="bg-yo-neon/10 rounded-xl p-3 border border-yo-neon/20 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-yo-neon shrink-0" />
            <span className="text-xs text-yo-neon font-medium">Withdrawal complete!</span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-[10px] text-yo-neon/60 hover:text-yo-neon"
            >
              Dismiss
            </button>
          </div>
          {assetsOrRequestId && (
            <p className="text-[11px] text-yo-neon/70 pl-6 font-mono">
              Received: {assetsOrRequestId}
            </p>
          )}
        </div>
      )}

      {/* Success — queued */}
      {isSuccess && instant === false && (
        <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-xs text-yellow-400 font-medium">Redemption queued</span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-[10px] text-yellow-400/60 hover:text-yellow-400"
            >
              Dismiss
            </button>
          </div>
          {assetsOrRequestId && (
            <p className="text-[11px] text-yellow-400/70 pl-6 font-mono">
              Request ID: {assetsOrRequestId}
            </p>
          )}
          <p className="text-[11px] text-yellow-400/60 pl-6">
            Your withdrawal is being processed. Assets will be available once fulfilled.
          </p>
        </div>
      )}

      {/* Error */}
      {isError && error && (
        <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20 space-y-1.5">
          <p className="text-xs text-red-400">{error.message.slice(0, 150)}</p>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-red-400/60 hover:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* CTA */}
      {isWrongChain ? (
        <button
          onClick={() => switchChain({ chainId })}
          disabled={isSwitching}
          className="w-full py-3 rounded-xl font-medium text-sm bg-yo-dark text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSwitching && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSwitching ? 'Switching...' : 'Switch Network'}
        </button>
      ) : (
        <button
          onClick={handleRedeem}
          disabled={buttonDisabled}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-yo-neon text-black hover:brightness-110 transition-all disabled:opacity-40 disabled:hover:brightness-100 flex items-center justify-center gap-2"
        >
          {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
          {buttonLabel}
          {!buttonDisabled && !isActive && <ArrowRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
```

#### 3. Wire withdraw form into tabs

**File**: `packages/web/src/yo-vault-actions/components/yo-vault-action-tabs.tsx`
**Changes**: Import and render `YoWithdrawForm` in the withdraw tab

```tsx
import { YoDepositForm } from './yo-deposit-form';
import { YoWithdrawForm } from './yo-withdraw-form';

// Replace the placeholders:
{activeTab === 'deposit' ? (
  <YoDepositForm chainId={chainId} vaultAddress={vaultAddress} />
) : (
  <YoWithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
)}
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` compiles without errors

#### Manual Verification:

- [ ] Navigate to yoUSD page → Withdraw tab
- [ ] Enter amount → see shares to redeem calculation
- [ ] Max button fills full position
- [ ] Click Withdraw → step progress (Approve → Redeem → Confirm)
- [ ] If instant: green success banner with asset amount received
- [ ] If queued: yellow banner with request ID and explanation
- [ ] If user has an existing pending redemption: yellow banner at top of withdraw form
- [ ] Error state shows red banner with retry option

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Tab Container & Polish

### Overview

Finalize the `YoVaultActionTabs` component with the complete YO theme, ensure both forms are wired, and add finishing touches.

### Changes Required:

#### 1. Finalize YoVaultActionTabs

**File**: `packages/web/src/yo-vault-actions/components/yo-vault-action-tabs.tsx`
**Changes**: Final version with both forms, YO surface styling, and vault info header

```tsx
'use client';

import { useState } from 'react';
import { useVaultState } from '@yo-protocol/react';
import { cn } from '@/lib/utils';
import { TokenIcon } from '@/components/token-icon';
import { YoDepositForm } from './yo-deposit-form';
import { YoWithdrawForm } from './yo-withdraw-form';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

type Tab = 'deposit' | 'withdraw';

export function YoVaultActionTabs({ chainId, vaultAddress }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');
  const { vaultState } = useVaultState(vaultAddress);

  return (
    <div className="font-yo bg-black rounded-2xl border border-white/5 p-4 space-y-4">
      {/* Vault badge */}
      {vaultState && (
        <div className="flex items-center gap-2">
          {vaultState.asset && (
            <TokenIcon chainId={chainId} address={vaultState.asset} className="w-5 h-5" />
          )}
          <span className="text-sm font-semibold text-white">{vaultState.name}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex bg-yo-dark rounded-lg p-1">
        {(['deposit', 'withdraw'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium capitalize rounded-md transition-all',
              activeTab === tab
                ? 'bg-yo-neon text-black'
                : 'text-yo-muted hover:text-white',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Form */}
      {activeTab === 'deposit' ? (
        <YoDepositForm chainId={chainId} vaultAddress={vaultAddress} />
      ) : (
        <YoWithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
      )}
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm --filter web typecheck` passes
- [ ] `pnpm --filter web build` compiles without errors
- [ ] No console warnings about missing keys or provider issues

#### Manual Verification:

- [ ] yoUSD page (`/vaults/8453/0x0000000f2eb9f69274678c76222b35eec7588a65`): YO sidebar renders with dark theme, neon tabs
- [ ] yoETH page (`/vaults/8453/0x3a43aec53490cb9fa922847385d82fe25d0e9de7`): Same YO sidebar
- [ ] yoBTC page (`/vaults/8453/0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc`): Same YO sidebar
- [ ] yoEUR page (`/vaults/8453/0x50c749ae210d3977adc824ae11f3c7fd10c871e9`): Same YO sidebar
- [ ] Non-YO vault page: Generic `VaultActionTabs` with white Card style
- [ ] Tab switching between Deposit/Withdraw is smooth
- [ ] Deposit full flow works end-to-end (enter amount → approve → deposit → success)
- [ ] Withdraw full flow works end-to-end (enter amount → redeem → instant/queued result)
- [ ] Mobile responsive: tabs and forms display correctly on narrow screens
- [ ] Step progress shows meaningful state transitions
- [ ] Vault badge shows correct vault name and token icon

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Automated:

- TypeScript compilation (`pnpm --filter web typecheck`)
- Next.js build (`pnpm --filter web build`)
- No additional unit tests required — the `@yo-protocol/react` hooks are tested by the SDK itself

### Manual Testing Steps:

1. **Deposit flow**: Connect wallet → enter amount on yoUSD → approve (if needed) → deposit → verify success banner and balance update
2. **Max deposit**: Click Max → verify amount fills → deposit → verify
3. **Withdraw flow**: Switch to Withdraw tab → enter amount → redeem → verify instant/queued result
4. **Max withdraw**: Click Max → verify full position → redeem
5. **Wrong chain**: Connect on Ethereum mainnet → verify "Switch Network" button appears
6. **No wallet**: Disconnect wallet → verify "Connect Wallet" state
7. **Error recovery**: Reject transaction in wallet → verify error banner → click "Try again"
8. **Non-YO vault**: Navigate to a generic vault → verify original `VaultActionTabs`
9. **All 4 yo-vaults**: Verify sidebar renders correctly on yoUSD, yoETH, yoBTC, yoEUR

## New Files Summary

| File | Purpose |
|---|---|
| `packages/web/src/yo-vault-actions/components/yo-vault-sidebar.tsx` | `YieldProvider` wrapper, scoped to YO vaults |
| `packages/web/src/yo-vault-actions/components/yo-vault-action-tabs.tsx` | Tab switcher with YO theme + vault badge |
| `packages/web/src/yo-vault-actions/components/yo-deposit-form.tsx` | Deposit form using `useDeposit` |
| `packages/web/src/yo-vault-actions/components/yo-withdraw-form.tsx` | Withdraw form using `useRedeem` |
| `packages/web/src/yo-vault-actions/components/step-progress.tsx` | Visual step indicator |
| `packages/web/src/yo-vault-actions/components/pending-redemption-banner.tsx` | Queued redemption status |

## Modified Files Summary

| File | Change |
|---|---|
| `packages/web/package.json` | Add `@yo-protocol/react` dependency |
| `packages/web/.env.example` | Add `NEXT_PUBLIC_YO_PARTNER_ID` |
| `packages/web/.env` | Add `NEXT_PUBLIC_YO_PARTNER_ID=9999` |
| `packages/web/src/app/vaults/[chainId]/[address]/layout.tsx` | Compute and pass `isYoVault` |
| `packages/web/src/app/vaults/[chainId]/[address]/vault-detail-layout.tsx` | Accept `isYoVault`, conditionally render `YoVaultSidebar` |

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0070-yo-vault-deposit-withdraw-hooks.md`
- Hooks API: `.claude/skills/yo-protocol-react/references/hooks-api.md`
- YO Design: `.claude/skills/yo-design/SKILL.md`
- Brand Kit: `.claude/skills/yo-design/references/brand-kit.md`
- Current sidebar: `packages/web/src/vault-actions/components/vault-action-tabs.tsx`
- Partner registration: https://docs.yo.xyz/integrations/build-with-yo
