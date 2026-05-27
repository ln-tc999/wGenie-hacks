'use client';

import { TreasuryDashboard } from './treasury-dashboard';
import { useAccount } from 'wagmi';
import { AgentChat } from '@/alpha/agent-chat';
import { ToolRenderer } from '@/alpha/tools/tool-renderer';
import { useAlphaRole } from '../hooks/use-alpha-role';
import { Shield } from 'lucide-react';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function TreasuryOverview({ chainId, vaultAddress }: Props) {
  const { address } = useAccount();
  const { hasAlphaRole, isConnected } = useAlphaRole({
    chainId,
    vaultAddress,
    userAddress: address,
  });

  return (
    <div className="space-y-4 font-sans">
      <TreasuryDashboard chainId={chainId} vaultAddress={vaultAddress} />
      <div className="relative">
        {isConnected && hasAlphaRole && (
          <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Alpha role granted — you can execute vault actions
          </div>
        )}
        <AgentChat
          apiEndpoint="/api/cfo/treasury/chat"
          body={{ callerAddress: address, vaultAddress, chainId }}
          chainId={chainId}
          toolRenderer={ToolRenderer}
          emptyStateText="Ask about Mantle vaults or manage your treasury"
          placeholder="Ask about Mantle vaults or manage your treasury..."
        />
      </div>
    </div>
  );
}
