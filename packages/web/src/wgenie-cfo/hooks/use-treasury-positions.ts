'use client';

import { useReadContracts, useBalance } from 'wagmi';
import { erc20Abi, erc4626Abi, formatUnits, type Address, zeroAddress } from 'viem';

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
  5003: [
    {
      id: 'USDC',
      name: 'USDC',
      address: '0x0a268A0000000000000000000000000000000000',
      underlying: 'USDC',
      underlyingAddress: '0x0a268A0000000000000000000000000000000000',
      underlyingDecimals: 6,
      logo: '/assets/wgenie/USDY.png',
      color: '#00FF8B',
    },
    {
      id: 'MNT',
      name: 'MNT',
      address: '0x65e37b558f64e2be5768db46df22f93d85741a9e',
      underlying: 'MNT',
      underlyingAddress: '0x65e37b558f64e2be5768db46df22f93d85741a9e',
      underlyingDecimals: 18,
      logo: '/assets/wgenie/MNT.svg',
      color: '#4E6FFF',
    },
    {
      id: 'mETH',
      name: 'mETH',
      address: '0xdEAddEaDdeadDEadDEADDEAddEAddEAddead1111',
      underlying: 'WETH',
      underlyingAddress: '0xdEAddEaDdeadDEadDEADDEAddEAddEAddead1111',
      underlyingDecimals: 18,
      logo: '/assets/wgenie/mETH.svg',
      color: '#627EEA',
    },
  ],
  5000: [
    {
      id: 'USDY',
      name: 'USDY',
      address: '0x5b3B637651061C1D71542fF1c6628A6B0A89c256',
      underlying: 'USDC',
      underlyingAddress: '0x09bc4e0d864851411267c6aabd1c217ef5b28394',
      underlyingDecimals: 6,
      logo: '/assets/wgenie/USDY.png',
      color: '#00FF8B',
    },
    {
      id: 'mETH',
      name: 'mETH',
      address: '0xc1375d048dfd270830a6c6d32847385d82fe25d0',
      underlying: 'WETH',
      underlyingAddress: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead1111',
      underlyingDecimals: 18,
      logo: '/assets/wgenie/mETH.svg',
      color: '#627EEA',
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

  // ─── Native balance for MNT ───
  const { data: nativeBalanceResult, isLoading: isNativeLoading } = useBalance({
    address: treasuryAddress,
    chainId,
  });

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

  const unallocatedBalances = mantleVaults.map((vault, i) => {
    // If it's MNT vault on Mantle, use native balance if ERC20 balance is 0
    if (
      (vault.id === 'MNT' || vault.underlying === 'MNT') &&
      nativeBalanceResult?.value &&
      (chainId === 5000 || chainId === 5003)
    ) {
      const erc20Bal = pass1Data?.[n + i]?.status === 'success' ? (pass1Data[n + i].result as bigint) : 0n;
      return erc20Bal > 0n ? erc20Bal : nativeBalanceResult.value;
    }

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
    isLoading: isPass1Loading || isPass2Loading || isNativeLoading,
    activePositions: positions.filter((p) => p.shares > 0n),
  };
}

export { MANTLE_VAULTS };
