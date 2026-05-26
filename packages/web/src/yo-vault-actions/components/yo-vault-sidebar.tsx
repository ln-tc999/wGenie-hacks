'use client';

import { YieldProvider } from '@yo-protocol/react';
import { YoVaultActionTabs } from './yo-vault-action-tabs';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

const PARTNER_ID = Number(process.env.NEXT_PUBLIC_YO_PARTNER_ID) || 9999;

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoVaultSidebar({ chainId, vaultAddress }: Props) {
  return (
    <YieldProvider partnerId={PARTNER_ID} defaultSlippageBps={50}>
      <YoVaultActionTabs chainId={chainId} vaultAddress={vaultAddress} />
    </YieldProvider>
  );
}
