import { useEnsAvatar, useEnsName } from 'wagmi';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';
import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';
import { useIsSafeWallet } from './hooks/use-is-safe-wallet';

interface Args {
  address: Address;
  chainId: ChainId;
}

export const useAccountParams = ({ address, chainId }: Args) => {
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
  });

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: mainnet.id,
  });

  const isSafeWallet = useIsSafeWallet({
    chainId,
    address,
  });

  return {
    address,
    chainId,
    ensName,
    ensAvatar,
    isSafeWallet,
  };
};

export type AccountParams = ReturnType<typeof useAccountParams>;
