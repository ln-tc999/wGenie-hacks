'use client';

import { useState } from 'react';
import { DepositForm } from './deposit-form';
import { WithdrawForm } from './withdraw-form';
import { cn } from '@/lib/utils';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
  accessManagerUrl?: string;
}

type Tab = 'deposit' | 'withdraw';

export function VaultActionTabs({ chainId, vaultAddress, accessManagerUrl }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');

  return (
    <div>
      <div className="flex border-b mb-3">
        {(['deposit', 'withdraw'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 pb-2 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'deposit' ? (
        <DepositForm chainId={chainId} vaultAddress={vaultAddress} accessManagerUrl={accessManagerUrl} />
      ) : (
        <WithdrawForm chainId={chainId} vaultAddress={vaultAddress} accessManagerUrl={accessManagerUrl} />
      )}
    </div>
  );
}
