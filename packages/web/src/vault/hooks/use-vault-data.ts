import { useReadContracts } from 'wagmi';
import { erc4626Abi, erc20Abi, type Address } from 'viem';
import type { ChainId } from '@/app/wagmi-provider';

interface Args {
  chainId: ChainId;
  vaultAddress: Address;
}

export const useVaultData = ({ chainId, vaultAddress }: Args) => {
  const result = useReadContracts({
    contracts: [
      {
        address: vaultAddress,
        abi: erc20Abi,
        functionName: 'name',
        chainId,
      },
      {
        address: vaultAddress,
        abi: erc20Abi,
        functionName: 'symbol',
        chainId,
      },
      {
        address: vaultAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        chainId,
      },
      {
        address: vaultAddress,
        abi: erc4626Abi,
        functionName: 'asset',
        chainId,
      },
    ],
    query: {
      staleTime: Infinity,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  });

  const [nameResult, symbolResult, decimalsResult, assetResult] =
    result.data || [];

  // Get asset decimals and symbol if asset is available
  const assetDataResult = useReadContracts({
    contracts: assetResult?.result
      ? [
          {
            address: assetResult.result,
            abi: erc20Abi,
            functionName: 'decimals',
            chainId,
          },
          {
            address: assetResult.result,
            abi: erc20Abi,
            functionName: 'symbol',
            chainId,
          },
        ]
      : [],
    query: {
      enabled: !!assetResult?.result,
      staleTime: Infinity,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  });

  const [assetDecimalsResult, assetSymbolResult] = assetDataResult.data || [];

  return {
    name: nameResult?.result,
    symbol: symbolResult?.result,
    decimals: decimalsResult?.result,
    asset: assetResult?.result,
    assetDecimals: assetDecimalsResult?.result,
    assetSymbol: assetSymbolResult?.result,
  };
};

export type VaultData = ReturnType<typeof useVaultData>;
