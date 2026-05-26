'use client';

import { useReadContract } from 'wagmi';
import type { Address } from 'viem';

const ALPHA_ROLE_ID = 200n;

const getAccessManagerAbi = [
  {
    type: 'function' as const,
    name: 'getAccessManagerAddress' as const,
    inputs: [],
    outputs: [{ name: '' as const, type: 'address' as const }],
    stateMutability: 'view' as const,
  },
] as const;

const hasRoleAbi = [
  {
    type: 'function' as const,
    name: 'hasRole' as const,
    inputs: [
      { name: 'roleId' as const, type: 'uint64' as const },
      { name: 'account' as const, type: 'address' as const },
    ],
    outputs: [
      { name: 'isMember' as const, type: 'bool' as const },
      { name: 'executionDelay' as const, type: 'uint32' as const },
    ],
    stateMutability: 'view' as const,
  },
] as const;

interface UseAlphaRoleParams {
  chainId: number;
  vaultAddress: Address;
  userAddress: Address | undefined;
}

export function useAlphaRole({ chainId, vaultAddress, userAddress }: UseAlphaRoleParams) {
  const { data: accessManagerAddress } = useReadContract({
    address: vaultAddress,
    abi: getAccessManagerAbi,
    functionName: 'getAccessManagerAddress',
    chainId,
  });

  const { data: roleResult, isLoading } = useReadContract({
    address: accessManagerAddress as Address,
    abi: hasRoleAbi,
    functionName: 'hasRole',
    args: [ALPHA_ROLE_ID, userAddress!],
    chainId,
    query: {
      enabled: !!accessManagerAddress && !!userAddress,
    },
  });

  return {
    hasAlphaRole: roleResult?.[0] === true,
    isLoading: !!userAddress && isLoading,
    isConnected: !!userAddress,
  };
}
