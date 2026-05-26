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

export function WithdrawForm({ chainId, vaultAddress, accessManagerUrl }: Props) {
  const { address: rawUserAddress, chain } = useAccount();
  const { connect } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [inputValue, setInputValue] = useState('');
  const [isMax, setIsMax] = useState(false);
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
    positionAssets,
    positionFormatted,
    positionUsd,
    tokenPriceUsd,
    refetchShares,
    refetchPosition,
  } = useVaultReads({ chainId, vaultAddress, userAddress });

  // ─── Withdraw-specific reads ───

  const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress!],
    query: { enabled: !!userAddress && !!assetAddress },
  });

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

  const withdrawUsd = formatAmountUsd(withdrawAmount, decimals, tokenPriceUsd);

  const hasEnoughPosition =
    positionAssets !== undefined && withdrawAmount > 0n && withdrawAmount <= positionAssets;

  // Convert input amount → shares for partial redeem
  const { data: sharesToRedeem } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'convertToShares',
    args: [withdrawAmount],
    query: { enabled: withdrawAmount > 0n && !isMax },
  });

  const sharesReady = isMax
    ? shareBalance !== undefined && shareBalance > 0n
    : sharesToRedeem !== undefined && sharesToRedeem > 0n;

  // ─── Redeem transaction ───

  const {
    writeContract: writeRedeem,
    data: redeemTxHash,
    isPending: isRedeeming,
    error: redeemError,
    reset: resetRedeem,
  } = useWriteContract();

  const { isLoading: isRedeemConfirming, isSuccess: isRedeemConfirmed } =
    useWaitForTransactionReceipt({ hash: redeemTxHash });

  // ─── Effects ───

  useEffect(() => {
    if (isRedeemConfirmed) {
      const refetchAll = () => {
        refetchShares().then(() => refetchPosition());
        refetchWalletBalance();
      };
      refetchAll();
      // Retry after delay — RPC may return stale data right after tx confirmation
      setTimeout(refetchAll, 2000);
      resetRedeem();
      setInputValue('');
      setIsMax(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [isRedeemConfirmed, refetchShares, refetchPosition, refetchWalletBalance, resetRedeem]);

  // ─── Handlers ───

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

  const handleMax = useCallback(() => {
    if (positionAssets !== undefined) {
      setInputValue(formatUnits(positionAssets, decimals));
      setIsMax(true);
    }
  }, [positionAssets, decimals]);

  // ─── State flags ───

  const isBusy = isRedeeming || isRedeemConfirming;

  const requiresWhitelist = !!accessManagerUrl;

  const buttonLabel = (() => {
    if (!userAddress) return 'Connect Wallet';
    if (requiresWhitelist && !isWhitelisted) return 'Not whitelisted';
    if (isRedeeming) return 'Confirm in wallet...';
    if (isRedeemConfirming) return 'Withdrawing...';
    if (parseError) return 'Invalid amount';
    if (withdrawAmount === 0n) return 'Enter amount';
    if (!hasEnoughPosition) return 'Exceeds position';
    return 'Withdraw';
  })();

  const buttonDisabled = !userAddress
    ? false
    : (requiresWhitelist && !isWhitelisted) ||
      withdrawAmount === 0n ||
      parseError ||
      !hasEnoughPosition ||
      !sharesReady ||
      isBusy;

  // ─── Render ───

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Withdraw {symbol}</span>
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
            if (v === '' || /^\d*\.?\d*$/.test(v)) {
              setInputValue(v);
              setIsMax(false);
            }
          }}
          disabled={isBusy}
          className="w-full bg-transparent text-lg font-mono outline-none placeholder:text-muted-foreground"
        />
        <div className="text-xs text-muted-foreground">{withdrawUsd}</div>
      </div>

      {/* Vault position — always rendered to avoid hydration mismatch */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Position: {positionFormatted !== undefined
            ? `${Number(positionFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`
            : '...'
          }
        </span>
        <button
          type="button"
          onClick={handleMax}
          disabled={isBusy || !positionAssets || positionAssets === 0n}
          className="text-primary font-medium hover:underline disabled:opacity-50"
        >
          Max
        </button>
      </div>

      {/* Summary */}
      <div className="border-t pt-3 space-y-1.5 text-xs">
        {withdrawAmount > 0n && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Withdraw ({symbol})</span>
            <span className="font-mono">
              {Number(formatUnits(withdrawAmount, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
          <span>Withdrawal successful!</span>
        </div>
      )}

      {/* Error */}
      {redeemError && !isBusy && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            {redeemError.message.slice(0, 150)}
          </p>
          <button
            type="button"
            onClick={() => resetRedeem()}
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
          onClick={!userAddress ? () => connect({ connector: injected() }) : handleRedeem}
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
