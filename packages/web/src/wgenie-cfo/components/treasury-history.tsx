import { useTreasuryHistory, type TreasuryActivity } from '../hooks/use-treasury-history';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, ArrowDownCircle, Zap, UserCheck } from 'lucide-react';
import { formatUnits, type Address } from 'viem';
import { getExplorerTxUrl } from '@/lib/get-explorer-tx-url';
import { truncateHex } from '@/lib/truncate-hex';

interface Props {
  treasuryAddress: string;
  chainId: number;
}

export function TreasuryHistory({ treasuryAddress, chainId }: Props) {
  const { data: history, isLoading } = useTreasuryHistory(treasuryAddress, chainId);

  if (isLoading) {
    return (
      <div className="bg-wgenie-dark rounded-lg border border-white/5 p-6 animate-pulse">
        <div className="h-4 w-32 bg-white/5 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-wgenie-dark rounded-lg border border-white/5 p-8 text-center">
        <p className="text-wgenie-muted text-sm italic">No recent activity found.</p>
      </div>
    );
  }

  return (
    <div className="bg-wgenie-dark rounded-lg border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-wgenie-muted">
          Recent Activity
        </h2>
      </div>
      <div className="divide-y divide-white/5">
        {history.map((item) => (
          <ActivityItem key={item.id} item={item} chainId={chainId} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ item, chainId }: { item: TreasuryActivity; chainId: number }) {
  const isDeposit = item.type === 'deposit';
  const isExecution = item.type === 'execution';

  return (
    <div className="px-4 py-3 hover:bg-white/[0.01] transition-colors flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${
          isDeposit ? 'bg-green-500/10 text-green-500' : 
          isExecution ? 'bg-primary/10 text-primary' : 
          'bg-white/10 text-wgenie-muted'
        }`}>
          {isDeposit && <ArrowDownCircle className="w-4 h-4" />}
          {isExecution && <Zap className="w-4 h-4" />}
          {!isDeposit && !isExecution && <UserCheck className="w-4 h-4" />}
        </div>
        <div>
          <div className="text-sm font-medium text-white flex items-center gap-1.5">
            {isDeposit && (
              <>
                Deposit {item.amount ? Number(formatUnits(BigInt(item.amount), 18)).toFixed(2) : '0'} MNT
              </>
            )}
            {isExecution && (
              <>
                Executed Call to {truncateHex(item.target || '')}
              </>
            )}
          </div>
          <div className="text-[11px] text-wgenie-muted">
            {formatDistanceToNow(new Date(item.timestamp * 1000), { addSuffix: true })}
            {item.user && ` • by ${truncateHex(item.user)}`}
          </div>
        </div>
      </div>
      
      <a
        href={getExplorerTxUrl(item.transactionHash as Address, chainId)}
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/5 text-wgenie-muted hover:text-white"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
