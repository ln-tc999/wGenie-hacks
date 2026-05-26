'use client';

import { useAccount, useReadContract } from 'wagmi';
import type { Address } from 'viem';

const WHITELIST_ROLE_ID = 800n;

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

export function useWhitelistRole({
  chainId,
  vaultAddress,
  enabled = true,
}: {
  chainId: number;
  vaultAddress: Address;
  enabled?: boolean;
}) {
  const { address, chain } = useAccount();
  const isCorrectChain = !!address && chain?.id === chainId;

  const { data: accessManagerAddress } = useReadContract({
    address: vaultAddress,
    abi: getAccessManagerAbi,
    functionName: 'getAccessManagerAddress',
    chainId,
    query: { enabled: enabled && isCorrectChain },
  });

  const { data: roleResult, isLoading: isCheckingRole } = useReadContract({
    address: accessManagerAddress as Address,
    abi: hasRoleAbi,
    functionName: 'hasRole',
    args: [WHITELIST_ROLE_ID, address!],
    chainId,
    query: {
      enabled: enabled && isCorrectChain && !!accessManagerAddress && !!address,
    },
  });

  const isWhitelisted = roleResult?.[0] === true;
  const isLoading = enabled && isCorrectChain && isCheckingRole;

  return { isWhitelisted, isLoading };
}
