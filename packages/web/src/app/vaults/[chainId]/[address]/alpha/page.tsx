import { AlphaChatWrapper } from './alpha-chat-wrapper';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

import { getAppConfig } from '@/lib/app-config';

export function generateMetadata() {
  return { title: `Alpha - ${getAppConfig().title}` };
}

export default async function VaultAlphaPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;

  return (
    <AlphaChatWrapper
      chainId={Number(chainId) as ChainId}
      vaultAddress={address as Address}
    />
  );
}
