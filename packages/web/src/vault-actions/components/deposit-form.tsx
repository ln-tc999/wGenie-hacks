'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { erc20Abi, erc4626Abi, formatUnits, parseUnits, type Address } from 'viem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TokenIcon } from '@/components/token-icon';
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useVaultReads, formatAmountUsd } from '../hooks/use-vault-reads';
import { useWhitelistRole } from '../hooks/use-whitelist-role';

interface Props {
  chainId: number;
  vaultAddress: Address;
  accessManagerUrl?: string;
}

export function DepositForm({ chainId, vaultAddress, accessManagerUrl }: Props) {
  const { address: rawUserAddress, chain } = useAccount();
  const { connect } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [inputValue, setInputValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Delay wallet-dependent rendering until after hydration
  const userAddress = mounted ? rawUserAddress : undefined;
  const isWrongChain = !!userAddress && chain?.id !== chainId;

  // ─── Whitelist role check (only for vaults with access manager) ───

  const { isWhitelisted, isLoading: isRoleLoading } = useWhitelistRole({
    chainId,
    vaultAddress,
    enabled: !!accessManagerUrl,
  });

  // ─── Shared on-chain reads ───

  const {
    assetAddress,
    decimals,
    symbol,
    shareBalance,
    positionFormatted,
    positionUsd,
    tokenPriceUsd,
    refetchShares,
    refetchPosition,
  } = useVaultReads({ chainId, vaultAddress, userAddress });

  // ─── Deposit-specific reads ───

  const { data: walletBalance, refetch: refetchBalance } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress!],
    query: { enabled: !!userAddress && !!assetAddress },
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress!, vaultAddress],
    query: { enabled: !!userAddress && !!assetAddress },
  });

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

  const walletFormatted = walletBalance !== undefined
    ? formatUnits(walletBalance, decimals)
    : undefined;

  const depositUsd = formatAmountUsd(depositAmount, decimals, tokenPriceUsd);

  const needsApproval =
    currentAllowance !== undefined &&
    depositAmount > 0n &&
    currentAllowance < depositAmount;

  const hasEnoughBalance =
    walletBalance !== undefined && depositAmount > 0n && depositAmount <= walletBalance;

  // ─── Approve transaction ───

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  // ─── Deposit transaction ───

  const {
    writeContract: writeDeposit,
    data: depositTxHash,
    isPending: isDepositing,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } =
    useWaitForTransactionReceipt({ hash: depositTxHash });

  // ─── Effects ───

  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance();
      resetApprove();
    }
  }, [isApproveConfirmed, refetchAllowance, resetApprove]);

  useEffect(() => {
    if (isDepositConfirmed) {
      const refetchAll = () => {
        refetchBalance();
        refetchAllowance();
        refetchShares().then(() => refetchPosition());
      };
      refetchAll();
      // Retry after delay — RPC may return stale data right after tx confirmation
      setTimeout(refetchAll, 2000);
      resetDeposit();
      setInputValue('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [isDepositConfirmed, refetchBalance, refetchAllowance, refetchShares, refetchPosition, resetDeposit]);

  // ─── Handlers ───

  const handleApprove = useCallback(() => {
    if (!assetAddress) return;
    writeApprove({
      address: assetAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vaultAddress, depositAmount],
      chainId,
    });
  }, [assetAddress, vaultAddress, depositAmount, chainId, writeApprove]);

  const handleDeposit = useCallback(() => {
    if (!userAddress) return;
    writeDeposit({
      address: vaultAddress,
      abi: erc4626Abi,
      functionName: 'deposit',
      args: [depositAmount, userAddress],
      chainId,
    });
  }, [vaultAddress, depositAmount, userAddress, chainId, writeDeposit]);

  const handleMax = useCallback(() => {
    if (walletBalance !== undefined) {
      setInputValue(formatUnits(walletBalance, decimals));
    }
  }, [walletBalance, decimals]);

  // ─── State flags ───

  const isBusy =
    isApproving || isApproveConfirming || isDepositing || isDepositConfirming;
  const error = approveError || depositError;

  const requiresWhitelist = !!accessManagerUrl;

  const buttonLabel = (() => {
    if (!userAddress) return 'Connect Wallet';
    if (requiresWhitelist && !isWhitelisted) return 'Not whitelisted';
    if (isApproving) return 'Confirm in wallet...';
    if (isApproveConfirming) return 'Approving...';
    if (isDepositing) return 'Confirm in wallet...';
    if (isDepositConfirming) return 'Depositing...';
    if (parseError) return 'Invalid amount';
    if (depositAmount === 0n) return 'Enter amount';
    if (!hasEnoughBalance) return 'Insufficient balance';
    if (needsApproval) return `Approve ${symbol}`;
    return 'Deposit';
  })();

  const buttonDisabled = !userAddress
    ? false
    : (requiresWhitelist && !isWhitelisted) ||
      depositAmount === 0n ||
      parseError ||
      !hasEnoughBalance ||
      isBusy;

  const handleClick = !userAddress
    ? () => connect({ connector: injected() })
    : needsApproval
      ? handleApprove
      : handleDeposit;

  // ─── Render ───

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Deposit {symbol}</span>
        {assetAddress && (
          <TokenIcon chainId={chainId} address={assetAddress} className="w-5 h-5" />
        )}
      </div>

      {/* Whitelist status + Access Manager link */}
      {accessManagerUrl && (
        <div className="flex items-center justify-between text-xs">
          <div>
            {userAddress && !isWrongChain && (
              isRoleLoading ? (
                <span className="text-muted-foreground">Checking role...</span>
              ) : isWhitelisted ? (
                <span className="text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Whitelisted
                </span>
              ) : (
                <span className="text-destructive">Not whitelisted</span>
              )
            )}
          </div>
          <a
            href={accessManagerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:underline flex items-center gap-1"
          >
            Manage roles <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Amount input */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d*\.?\d*$/.test(v)) setInputValue(v);
          }}
          disabled={isBusy}
          className="w-full bg-transparent text-lg font-mono outline-none placeholder:text-muted-foreground"
        />
        <div className="text-xs text-muted-foreground">{depositUsd}</div>
      </div>

      {/* Wallet balance — always rendered to avoid hydration mismatch */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Balance: {walletFormatted !== undefined
            ? `${Number(walletFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`
            : '...'
          }
        </span>
        <button
          type="button"
          onClick={handleMax}
          disabled={isBusy || !walletBalance}
          className="text-primary font-medium hover:underline disabled:opacity-50"
        >
          Max
        </button>
      </div>

      {/* Summary */}
      <div className="border-t pt-3 space-y-1.5 text-xs">
        {depositAmount > 0n && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit ({symbol})</span>
            <span className="font-mono">
              {Number(formatUnits(depositAmount, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Your Position</span>
          <span className="font-mono">
            {positionFormatted !== undefined
              ? `${Number(positionFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol} (${positionUsd})`
              : '-'
            }
          </span>
        </div>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-center gap-2 text-green-500 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>Deposit successful!</span>
        </div>
      )}

      {/* Error */}
      {error && !isBusy && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            {error.message.slice(0, 150)}
          </p>
          <button
            type="button"
            onClick={() => { resetApprove(); resetDeposit(); }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Action button */}
      {isWrongChain ? (
        <Button
          onClick={() => switchChain({ chainId })}
          disabled={isSwitching}
          size="sm"
          className="w-full"
        >
          {isSwitching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isSwitching ? 'Switching...' : `Switch to chain ${chainId}`}
        </Button>
      ) : (
        <Button
          onClick={handleClick}
          disabled={buttonDisabled}
          size="sm"
          className="w-full"
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {buttonLabel}
        </Button>
      )}
    </Card>
  );
}
