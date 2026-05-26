'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import {
  useRedeem,
  useVaultState,
  useUserPosition,
  useShareBalance,
} from '@yo-protocol/react';
import { formatUnits, parseUnits, type Address } from 'viem';
import { Loader2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Convert asset amount → shares proportionally
  const sharesToRedeem = isMax
    ? currentShares
    : positionAssets && positionAssets > 0n && currentShares
      ? (withdrawAmount * currentShares) / positionAssets
      : undefined;

  const sharesReady = sharesToRedeem !== undefined && sharesToRedeem > 0n;

  // ─── Redeem action ───

  const { redeem, step, isError, error, isSuccess, instant, assetsOrRequestId, reset } =
    useRedeem({
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
    <div className="space-y-3">
      {/* Pending redemption banner */}
      {userAddress && <PendingRedemptionBanner vaultAddress={vaultAddress} />}

      {/* Amount input */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">You withdraw</span>
          {assetAddress && (
            <div className="flex items-center gap-1.5">
              <TokenIcon chainId={chainId} address={assetAddress} className="w-4 h-4" />
              <span className="text-xs font-medium">{symbol}</span>
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
          className="w-full bg-transparent text-lg font-mono outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {positionFormatted !== undefined
              ? `Position: ${formatNum(positionFormatted)}`
              : 'Position: ...'}
          </span>
          <button
            type="button"
            onClick={handleMax}
            disabled={isActive || !positionAssets || positionAssets === 0n}
            className="text-xs text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Max
          </button>
        </div>
      </div>

      {/* Shares info */}
      {sharesToRedeem && sharesToRedeem > 0n && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted-foreground">Shares to redeem</span>
          <span className="font-mono">
            {formatNum(formatUnits(sharesToRedeem, vaultDecimals))}
          </span>
        </div>
      )}

      {/* Step progress */}
      {isActive && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <StepProgress steps={REDEEM_STEPS} currentStep={step} />
        </div>
      )}

      {/* Success — instant */}
      {isSuccess && instant === true && (
        <div className="flex items-center gap-2 text-green-500 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">Withdrawal complete!</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-muted-foreground hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success — queued */}
      {isSuccess && instant === false && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              Redemption queued
            </span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-xs text-muted-foreground hover:underline"
            >
              Dismiss
            </button>
          </div>
          {assetsOrRequestId && (
            <p className="text-[11px] text-muted-foreground pl-6 font-mono">
              Request ID: {assetsOrRequestId}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground pl-6">
            Your withdrawal is being processed. Assets will be available once fulfilled.
          </p>
        </div>
      )}

      {/* Error */}
      {isError && error && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">{error.message.slice(0, 150)}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* CTA */}
      {isWrongChain ? (
        <Button
          onClick={() => switchChain({ chainId })}
          disabled={isSwitching}
          size="sm"
          variant="outline"
          className="w-full"
        >
          {isSwitching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isSwitching ? 'Switching...' : 'Switch Network'}
        </Button>
      ) : (
        <Button
          onClick={handleRedeem}
          disabled={buttonDisabled}
          size="sm"
          className="w-full"
        >
          {isActive && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
