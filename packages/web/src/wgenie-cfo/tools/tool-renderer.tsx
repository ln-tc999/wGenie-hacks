import { Loader2, ShieldCheck } from 'lucide-react';
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
    case 'guardrails-config': {
      const { data } = typed as unknown as { data: any };
      if (!data) return null;
      return (
        <div className="bg-wgenie-dark rounded-lg p-3 border border-white/5 space-y-2 text-white max-w-sm mt-2">
          <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Treasury Guardrails Status</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 p-1.5 rounded">
              <p className="text-[10px] text-wgenie-muted uppercase">Daily Limit</p>
              <p className="font-semibold">{data.dailyLimitFormatted} MNT</p>
            </div>
            <div className="bg-white/5 p-1.5 rounded">
              <p className="text-[10px] text-wgenie-muted uppercase">Used Today</p>
              <p className="font-semibold">{data.usedTodayFormatted} MNT</p>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-wgenie-muted pt-1">
            <span>Moe Whitelist: {data.whitelist?.merchantMoe ? '✅' : '❌'}</span>
            <span>Aave Whitelist: {data.whitelist?.aaveV3 ? '✅' : '❌'}</span>
            <span>Status: {data.paused ? '⏸️ Paused' : '🟢 Active'}</span>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
