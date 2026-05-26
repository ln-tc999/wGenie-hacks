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
import { Button } from '@/components/ui/button';
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
  const walletBalance = tokenBalance?.balance;

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

  const { deposit, step, isError, error, isSuccess, reset } = useDeposit({
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
    position?.assets !== undefined ? formatUnits(position.assets, decimals) : undefined;

  // ─── Render ───

  return (
    <div className="space-y-3">
      {/* Amount input */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">You deposit</span>
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
            if (v === '' || /^\d*\.?\d*$/.test(v)) setInputValue(v);
          }}
          disabled={isActive}
          className="w-full bg-transparent text-lg font-mono outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {walletFormatted !== undefined
              ? `Balance: ${formatNum(walletFormatted)}`
              : 'Balance: ...'}
          </span>
          <button
            type="button"
            onClick={handleMax}
            disabled={isActive || !walletBalance}
            className="text-xs text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Max
          </button>
        </div>
      </div>

      {/* Preview */}
      {depositAmount > 0n && previewShares !== undefined && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted-foreground">You receive (est.)</span>
          <span className="font-mono">
            {formatNum(formatUnits(previewShares, vaultState?.decimals ?? 18))}{' '}
            <span className="text-muted-foreground">{vaultState?.name ?? 'shares'}</span>
          </span>
        </div>
      )}

      {/* Position */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground">Your position</span>
        <span className="font-mono">
          {positionFormatted !== undefined ? `${formatNum(positionFormatted)} ${symbol}` : '-'}
        </span>
      </div>

      {/* Step progress (visible during active flow) */}
      {isActive && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <StepProgress steps={DEPOSIT_STEPS} currentStep={step} />
        </div>
      )}

      {/* Success */}
      {isSuccess && (
        <div className="flex items-center gap-2 text-green-500 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">Deposit successful!</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-muted-foreground hover:underline"
          >
            Dismiss
          </button>
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
          onClick={handleDeposit}
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
