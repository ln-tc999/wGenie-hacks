'use client';

import { useState } from 'react';
import { useVaultState } from '@yo-protocol/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { TokenIcon } from '@/components/token-icon';
import { YoDepositForm } from './yo-deposit-form';
import { YoWithdrawForm } from './yo-withdraw-form';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

type Tab = 'deposit' | 'withdraw';

export function YoVaultActionTabs({ chainId, vaultAddress }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');
  const { vaultState } = useVaultState(vaultAddress);

  return (
    <Card className="p-4 space-y-4">
      {/* Vault badge */}
      {vaultState && (
        <div className="flex items-center gap-2">
          {vaultState.asset && (
            <TokenIcon chainId={chainId} address={vaultState.asset} className="w-5 h-5" />
          )}
          <span className="text-sm font-semibold">{vaultState.name}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b">
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

      {/* Form */}
      {activeTab === 'deposit' ? (
        <YoDepositForm chainId={chainId} vaultAddress={vaultAddress} />
      ) : (
        <YoWithdrawForm chainId={chainId} vaultAddress={vaultAddress} />
      )}
    </Card>
  );
}
