import { Plus, Target, Clock } from 'lucide-react';
import { STRATEGIES, type Strategy } from '@/wgenie-cfo/components/dashboard/mock-data';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<Strategy['status'], string> = {
  Active: 'bg-[#C5FF4A]/10 text-[#C5FF4A]',
  Paused: 'bg-[#8E8E8E]/10 text-[#8E8E8E]',
  Draft: 'bg-[#4E6FFF]/10 text-[#4E6FFF]',
};

export default function StrategyPage() {
  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <p className="max-w-md text-sm text-[#8E8E8E]">
          Define how the agent allocates and rebalances your treasury. Each
          strategy proposes actions you confirm before they execute.
        </p>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 bg-[#C5FF4A] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          New strategy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {STRATEGIES.map((s) => (
          <div
            key={s.name}
            className="flex flex-col border border-[#262626] bg-[#141414] p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-[#C5FF4A]" />
                <h3 className="font-bold text-white">{s.name}</h3>
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  STATUS_STYLE[s.status],
                )}
              >
                {s.status}
              </span>
            </div>

            <p className="flex-1 text-sm leading-relaxed text-[#8E8E8E]">
              {s.description}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-px border border-[#262626] bg-[#262626]">
              <div className="bg-[#141414] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#8E8E8E]">
                  Target APY
                </p>
                <p className="text-lg font-bold tabular-nums text-[#C5FF4A]">
                  {s.targetApyLabel}
                </p>
              </div>
              <div className="bg-[#141414] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#8E8E8E]">
                  Allocated
                </p>
                <p className="text-lg font-bold tabular-nums text-white">
                  {s.allocationLabel}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8E8E8E]">
              <Clock className="size-3.5" />
              {s.cadence}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
