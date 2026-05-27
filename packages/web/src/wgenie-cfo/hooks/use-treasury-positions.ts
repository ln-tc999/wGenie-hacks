'use client';

import { useReadContracts } from 'wagmi';
import { erc20Abi, erc4626Abi, formatUnits, type Address } from 'viem';

/**
 * Mantle vault configs per chain.
 */
const MANTLE_VAULTS: Record<
  number,
  Array<{
    id: string;
    name: string;
    address: Address;
    underlying: string;
    underlyingAddress: Address;
    underlyingDecimals: number;
    logo: string;
    color: string;
  }>
> = {
  8453: [
    {
      id: 'USDY',
      name: 'USDY',
      address: '0x0000000f2eb9f69274678c76222b35eec7588a65',
      underlying: 'USDC',
      underlyingAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      underlyingDecimals: 6,
      logo: '/assets/wgenie/USDY.png',
      color: '#00FF8B',
    },
    {
      id: 'mETH',
      name: 'mETH',
      address: '0x3a43aec53490cb9fa922847385d82fe25d0e9de7',
      underlying: 'WETH',
      underlyingAddress: '0x4200000000000000000000000000000000000006',
      underlyingDecimals: 18,
      logo: '/assets/wgenie/mETH.svg',
      color: '#627EEA',
    },
    {
      id: 'cmBTC',
      name: 'cmBTC',
      address: '0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc',
      underlying: 'cbBTC',
      underlyingAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      underlyingDecimals: 8,
      logo: '/assets/wgenie/cmBTC.svg',
      color: '#FFAF4F',
    },
    {
      id: 'MNT',
      name: 'MNT',
      address: '0x50c749ae210d3977adc824ae11f3c7fd10c871e9',
      underlying: 'EURC',
      underlyingAddress: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
      underlyingDecimals: 6,
      logo: '/assets/wgenie/MNT.svg',
      color: '#4E6FFF',
    },
  ],
};

export interface TreasuryPosition {
  vaultId: string;
  vaultName: string;
  vaultAddress: Address;
  underlying: string;
  underlyingAddress: Address;
  underlyingDecimals: number;
  logo: string;
  color: string;
  shares: bigint;
  assets: bigint;
  assetsFormatted: string;
  unallocatedBalance: bigint;
  unallocatedFormatted: string;
}

interface UseTreasuryPositionsParams {
  chainId: number;
  treasuryAddress: Address;
}

export function useTreasuryPositions({
  chainId,
  treasuryAddress,
}: UseTreasuryPositionsParams) {
  const mantleVaults = MANTLE_VAULTS[chainId] ?? [];

  // ─── Pass 1: Read share balances + per-vault unallocated balances ───
  const pass1Contracts = [
    // [0..N-1] Share balances in Mantle vaults
    ...mantleVaults.map((v) => ({
      chainId,
      address: v.address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [treasuryAddress] as const,
    })),
    // [N..2N-1] Per-vault unallocated: balanceOf(underlying, treasury)
    ...mantleVaults.map((v) => ({
      chainId,
      address: v.underlyingAddress,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [treasuryAddress] as const,
    })),
  ];

  const { data: pass1Data, isLoading: isPass1Loading } = useReadContracts({
    contracts: pass1Contracts,
    query: { enabled: pass1Contracts.length > 0 },
  });

  const n = mantleVaults.length;

  const shareBalances = mantleVaults.map((_, i) => {
    const result = pass1Data?.[i];
    return result?.status === 'success' ? (result.result as bigint) : 0n;
  });

  const unallocatedBalances = mantleVaults.map((_, i) => {
    const result = pass1Data?.[n + i];
    return result?.status === 'success' ? (result.result as bigint) : 0n;
  });

  // ─── Pass 2: convertToAssets for each share balance ───
  const pass2Contracts = mantleVaults.map((v, i) => ({
    chainId,
    address: v.address,
    abi: erc4626Abi,
    functionName: 'convertToAssets' as const,
    args: [shareBalances[i]] as const,
  }));

  const { data: pass2Data, isLoading: isPass2Loading } = useReadContracts({
    contracts: pass2Contracts,
    query: { enabled: !isPass1Loading && !!pass1Data },
  });

  // ─── Build positions ───
  const positions: TreasuryPosition[] = mantleVaults.map((vault, i) => {
    const shares = shareBalances[i];
    const assets =
      shares > 0n && pass2Data?.[i]?.status === 'success'
        ? (pass2Data[i].result as bigint)
        : 0n;
    const unalloc = unallocatedBalances[i];

    return {
      vaultId: vault.id,
      vaultName: vault.name,
      vaultAddress: vault.address,
      underlying: vault.underlying,
      underlyingAddress: vault.underlyingAddress,
      underlyingDecimals: vault.underlyingDecimals,
      logo: vault.logo,
      color: vault.color,
      shares,
      assets,
      assetsFormatted: formatUnits(assets, vault.underlyingDecimals),
      unallocatedBalance: unalloc,
      unallocatedFormatted: formatUnits(unalloc, vault.underlyingDecimals),
    };
  });

  return {
    positions,
    isLoading: isPass1Loading || isPass2Loading,
    activePositions: positions.filter((p) => p.shares > 0n),
  };
}

export { MANTLE_VAULTS };
