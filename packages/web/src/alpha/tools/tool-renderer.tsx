import { Loader2 } from 'lucide-react';
import { TransactionProposal } from './transaction-proposal/transaction-proposal';
import type { ToolPartProps } from '../agent-chat';
import type { TransactionProposalOutput } from '@wgenie/fusion-mastra/alpha-types';

export function ToolRenderer({ state, output, chainId }: ToolPartProps) {
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
    case 'transaction-proposal': {
      const proposal = typed as TransactionProposalOutput;
      return <TransactionProposal {...proposal} />;
    }
    case 'balance-check':
      // Lightweight balance data — not rendered, agent uses it internally
      return null;
    default:
      return null;
  }
}
