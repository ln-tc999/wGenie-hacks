'use client';

import { AccountContext, useAccountContext } from './account.context';
import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';
import { AccountAvatar } from '@/account/components/account-avatar';
import { BlockExplorerAddress } from '@/components/ui/block-explorer-address';
import { useAccountParams } from '@/account/account.params';

interface Props {
  address: Address;
  chainId: ChainId;
}

export const Account = ({ address, chainId }: Props) => {
  const params = useAccountParams({ address, chainId });

  return (
    <AccountContext.Provider value={{ params }}>
      <AccountContent />
    </AccountContext.Provider>
  );
};

export const AccountContent = () => {
  const {
    params: { address, chainId, ensName },
  } = useAccountContext();

  return (
    <div className="flex items-center gap-3">
      <AccountAvatar className="h-8 w-8" />
      <div className="flex flex-col gap-1">
        <BlockExplorerAddress
          address={address}
          chainId={chainId}
          label={ensName || undefined}
        />
      </div>
    </div>
  );
};
