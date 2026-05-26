'use client';

import { useReadContract } from 'wagmi';
import { erc20Abi, erc4626Abi, formatUnits, type Address } from 'viem';

/** Minimal ABI to read the PlasmaVault's price oracle address */
const plasmaVaultPriceOracleAbi = [
  {
    type: 'function' as const,
    name: 'getPriceOracleMiddleware' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' as const }],
    stateMutability: 'view' as const,
  },
] as const;

/** Minimal ABI to read asset price from the price oracle */
const getAssetPriceAbi = [
  {
    type: 'function' as const,
    name: 'getAssetPrice' as const,
    inputs: [{ name: 'asset_', type: 'address' as const }],
    outputs: [
      { name: '', type: 'uint256' as const },
      { name: '', type: 'uint256' as const },
    ],
    stateMutability: 'view' as const,
  },
] as const;

interface UseVaultReadsParams {
  chainId: number;
  vaultAddress: Address;
  userAddress?: Address;
}

export function useVaultReads({ chainId, vaultAddress, userAddress }: UseVaultReadsParams) {
  // ─── Asset info ───

  const { data: assetAddress } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'asset',
  });

  const { data: assetDecimals } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: !!assetAddress },
  });

  const { data: assetSymbol } = useReadContract({
    chainId,
    address: assetAddress!,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: !!assetAddress },
  });

  // ─── Share balance & position ───

  const { data: shareBalance, refetch: refetchShares } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress!],
    query: { enabled: !!userAddress },
  });

  const { data: positionAssets, refetch: refetchPosition } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: [shareBalance!],
    query: { enabled: shareBalance !== undefined && shareBalance > 0n },
  });

  // ─── Price oracle ───

  const { data: priceOracleAddress } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: plasmaVaultPriceOracleAbi,
    functionName: 'getPriceOracleMiddleware',
  });

  const { data: assetPriceData } = useReadContract({
    chainId,
    address: priceOracleAddress!,
    abi: getAssetPriceAbi,
    functionName: 'getAssetPrice',
    args: [assetAddress!],
    query: { enabled: !!priceOracleAddress && !!assetAddress },
  });

  // ─── Derived values ───

  const decimals = assetDecimals ?? 6;
  const symbol = assetSymbol ?? '...';

  const tokenPriceUsd = assetPriceData
    ? Number(assetPriceData[0]) / 10 ** Number(assetPriceData[1])
    : undefined;

  const positionFormatted = shareBalance === 0n
    ? '0'
    : positionAssets !== undefined
      ? formatUnits(positionAssets, decimals)
      : undefined;

  const positionUsd = shareBalance === 0n
    ? '$0.00'
    : positionAssets !== undefined && tokenPriceUsd !== undefined
      ? `$${(Number(formatUnits(positionAssets, decimals)) * tokenPriceUsd).toFixed(2)}`
      : '-';

  return {
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
  };
}

/** Format a token amount as USD, using on-chain price if available */
export function formatAmountUsd(
  amount: bigint,
  decimals: number,
  tokenPriceUsd: number | undefined,
): string {
  if (amount === 0n) return '$0';
  if (tokenPriceUsd === undefined) return `${Number(formatUnits(amount, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  return `$${(Number(formatUnits(amount, decimals)) * tokenPriceUsd).toFixed(2)}`;
}
