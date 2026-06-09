import { Loader2 } from 'lucide-react';
import type { ToolPartProps } from '@/alpha/agent-chat';
import type { TreasuryTransactionProposalOutput } from '@/lib/types/wgenie-cfo';
import { TreasuryTransactionProposal } from '../components/treasury-transaction-proposal';

export function TreasuryToolRenderer({ state, output, chainId }: ToolPartProps) {
  if (state === 'input-available' || state === 'input-streaming') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  }

  if (state !== 'output-available' || !output) {
    return null;
  }

  const typed = output as { type: string };

  switch (typed.type) {
    case 'treasury-transaction-proposal':
      return <TreasuryTransactionProposal {...(typed as TreasuryTransactionProposalOutput)} />;
    default:
      return null;
  }
}
