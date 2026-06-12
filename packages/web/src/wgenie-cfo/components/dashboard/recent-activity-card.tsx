'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Activity as ActivityIcon,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TREASURY } from './mock-data';

type ActivityKind = 'deposit' | 'supply' | 'swap' | 'withdraw';

type ActivityRow = {
  kind: ActivityKind;
  action: string;
  detail: string;
  amountLabel: string;
  date: string;
  status: 'Confirmed' | 'Pending';
  hash: string;
};

const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  deposit: { icon: ArrowDownLeft, className: 'bg-[#C5FF4A]/10 text-[#C5FF4A]' },
  supply: { icon: ArrowUpRight, className: 'bg-[#8E8E8E]/10 text-[#8E8E8E]' },
  withdraw: { icon: ArrowUpRight, className: 'bg-[#8E8E8E]/10 text-[#8E8E8E]' },
  swap: { icon: Repeat, className: 'bg-[#4E6FFF]/10 text-[#4E6FFF]' },
};

const FILTERS = ['All', 'Deposit', 'Withdraw'] as const;

export function RecentActivityCard() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(
          `/api/vaults/${TREASURY.chainId}/${TREASURY.address}/activity?limit=5`,
        );
        if (res.ok) {
          const json = await res.json();
          const activities = json.activities || [];
          const mapped: ActivityRow[] = activities.map((a: any) => ({
            kind: a.type === 'deposit' ? 'deposit' : a.type === 'withdraw' ? 'withdraw' : 'swap',
            action: a.type || 'Action',
            detail: a.depositor ? `from ${a.depositor.slice(0, 6)}…${a.depositor.slice(-4)}` : '',
            amountLabel: a.amount ? `${(Number(a.amount) / 1e18).toFixed(4)}` : '',
            date: a.timestamp ? new Date(a.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
            status: 'Confirmed',
            hash: a.tx_hash?.slice(0, 10) || '',
          }));
          setRows(mapped);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, []);

  return (
    <div className="flex flex-col border border-[#262626] bg-[#141414] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Recent activity</h3>
        <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              type="button"
              className={cn(
                'transition-colors',
                i === 0 ? 'text-white' : 'text-[#8E8E8E] hover:text-white',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-[#8E8E8E]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-sm text-[#8E8E8E]">
          No activity yet
        </div>
      ) : (
        <div className="flex-1 space-y-3">
          {rows.map((item, idx) => {
            const { icon: Icon, className } = KIND_STYLE[item.kind] || KIND_STYLE.swap;
            return (
              <div
                key={idx}
                className="flex items-center gap-4 border border-[#262626] bg-[#0D0D0D]/50 p-3"
              >
                <div className={cn('flex size-10 items-center justify-center rounded-full', className)}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center justify-between">
                    <p className="text-sm font-bold tabular-nums text-white">
                      {item.amountLabel}
                    </p>
                    <span className="text-[10px] tabular-nums text-[#8E8E8E]">
                      {item.date}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8E8E8E]">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="mt-6 flex w-full items-center justify-between border border-[#262626] bg-[#0D0D0D] px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-[#262626]"
      >
        <span className="flex items-center gap-3">
          <ActivityIcon className="size-5 text-[#8E8E8E]" />
          See all activity
        </span>
        <ChevronRight className="size-4 text-[#8E8E8E]" />
      </button>
    </div>
  );
}
