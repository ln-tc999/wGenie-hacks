'use client';

import { AppProviders } from '@/app/app-providers';
import { VaultProvider } from '@/vault/vault.context';
import { VaultDetailHeader } from '@/vault-details/components/vault-detail-header';
import { DepositFeatures } from '@/vault-actions/components/deposit-features';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  children: React.ReactNode;
  chainId: ChainId;
  vaultAddress: Address;
  vaultName?: string;
  protocol?: string;
}

export function VaultDetailLayout({
  children,
  chainId,
  vaultAddress,
  vaultName,
  protocol,
}: Props) {
  return (
    <AppProviders>
      <VaultProvider chainId={chainId} vaultAddress={vaultAddress}>
        <div className="container mx-auto px-4 py-6 overflow-x-hidden space-y-6">
          <VaultDetailHeader
            chainId={chainId}
            vaultAddress={vaultAddress}
            vaultName={vaultName}
            protocol={protocol}
          />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              {children}
            </div>
            <div className="w-full lg:w-[380px] shrink-0 order-first lg:order-last">
              <div className="lg:sticky lg:top-6">
                <DepositFeatures chainId={chainId} vaultAddress={vaultAddress} />
              </div>
            </div>
          </div>
        </div>
      </VaultProvider>
    </AppProviders>
  );
}
