import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';
import { useReadContract } from 'wagmi';

interface Args {
  chainId: ChainId;
  address: Address;
}

export const useIsSafeWallet = ({ chainId, address }: Args) => {
  const { data: owners, error } = useReadContract({
    chainId,
    address,
    abi: safeAbiFragment,
    functionName: 'getOwners',
    query: {
      enabled: address !== undefined && chainId !== undefined,
    },
  });

  if (error) return false;

  return Array.isArray(owners);
};

const safeAbiFragment = [
  {
    constant: true,
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    type: 'function',
  },
];
