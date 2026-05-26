'use client';

import { useAccount } from 'wagmi';
import { AgentChat } from '@/alpha/agent-chat';
import { ToolRenderer } from '@/alpha/tools/tool-renderer';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function AlphaChatWrapper({ chainId, vaultAddress }: Props) {
  const { address } = useAccount();

  return (
    <AgentChat
      apiEndpoint={`/api/vaults/${chainId}/${vaultAddress}/chat`}
      body={address ? { callerAddress: address } : undefined}
      chainId={chainId}
      toolRenderer={ToolRenderer}
      emptyStateText="Ask anything about this vault"
      placeholder="Ask about this vault..."
    />
  );
}
