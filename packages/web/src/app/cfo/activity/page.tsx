import {
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  type LucideIcon,
} from 'lucide-react';
import {
  ACTIVITY_ROWS,
  type ActivityKind,
} from '@/wgenie-cfo/components/dashboard/mock-data';
import { cn } from '@/lib/utils';

const KIND_STYLE: Record<
  ActivityKind,
  { icon: LucideIcon; className: string }
> = {
  deposit: { icon: ArrowDownLeft, className: 'bg-[#C5FF4A]/10 text-[#C5FF4A]' },
  supply: { icon: ArrowUpRight, className: 'bg-[#8E8E8E]/10 text-[#8E8E8E]' },
  withdraw: { icon: ArrowDownLeft, className: 'bg-[#8E8E8E]/10 text-[#8E8E8E]' },
  swap: { icon: Repeat, className: 'bg-[#4E6FFF]/10 text-[#4E6FFF]' },
};

const FILTERS = ['All', 'Deposit', 'Supply', 'Swap', 'Withdraw'] as const;

export default function ActivityPage() {
  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            type="button"
            className={cn(
              'border px-3 py-1.5 text-xs font-bold transition-colors',
              i === 0
                ? 'border-[#C5FF4A]/40 bg-[#C5FF4A]/10 text-[#C5FF4A]'
                : 'border-[#262626] bg-[#141414] text-[#8E8E8E] hover:text-white',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[#262626] bg-[#141414]">
        <div className="grid grid-cols-12 gap-2 border-b border-[#262626] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
          <div className="col-span-5">Action</div>
          <div className="col-span-3 text-right">Amount</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Tx</div>
        </div>

        {ACTIVITY_ROWS.map((row, idx) => {
          const { icon: Icon, className } = KIND_STYLE[row.kind];
          return (
            <div
              key={idx}
              className="grid grid-cols-12 items-center gap-2 border-b border-[#262626] px-5 py-4 last:border-b-0 transition-colors hover:bg-[#171717]"
            >
              <div className="col-span-5 flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    className,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {row.action}{' '}
                    <span className="font-normal text-[#8E8E8E]">
                      · {row.detail}
                    </span>
                  </p>
                  <p className="truncate text-xs text-[#8E8E8E]">{row.date}</p>
                </div>
              </div>
              <div className="col-span-3 text-right font-bold tabular-nums text-white">
                {row.amountLabel}
              </div>
              <div className="col-span-2">
                <span
                  className={cn(
                    'inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    row.status === 'Confirmed'
                      ? 'bg-[#C5FF4A]/10 text-[#C5FF4A]'
                      : 'bg-[#FFAF4F]/10 text-[#FFAF4F]',
                  )}
                >
                  {row.status}
                </span>
              </div>
              <a
                href="https://explorer.sepolia.mantle.xyz"
                target="_blank"
                rel="noreferrer"
                className="col-span-2 text-right font-mono text-xs text-[#8E8E8E] transition-colors hover:text-[#C5FF4A]"
              >
                {row.hash}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
