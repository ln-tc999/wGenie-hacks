'use client';

import { useState } from 'react';
import { Plus, Target, Clock } from 'lucide-react';
import { STRATEGIES, type Strategy } from '@/wgenie-cfo/components/dashboard/mock-data';
import { NewStrategyModal } from '@/wgenie-cfo/components/dashboard/new-strategy-modal';
import { StrategyDetailModal } from '@/wgenie-cfo/components/dashboard/strategy-detail-modal';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<Strategy['status'], string> = {
  Active: 'bg-[#C5FF4A]/10 text-[#C5FF4A]',
  Paused: 'bg-[#8E8E8E]/10 text-[#8E8E8E]',
  Draft: 'bg-[#3B5BDB]/10 text-[#3B5BDB]',
};

export default function StrategyPage() {
  const [strategies, setStrategies] = useState<Strategy[]>(STRATEGIES);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  function handleSave(newStrategy: Strategy) {
    setStrategies((prev) => [newStrategy, ...prev]);
  }

  function handleUpdate(updated: Strategy) {
    setStrategies((prev) =>
      prev.map((s) => (s.name === selectedStrategy?.name ? updated : s)),
    );
  }

  function handleDelete(name: string) {
    setStrategies((prev) => prev.filter((s) => s.name !== name));
  }

  return (
    <>
      <div className="h-full space-y-6 overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <p className="max-w-md text-sm text-[#8E8E8E]">
            Define how the agent allocates and rebalances your treasury. Each
            strategy proposes actions you confirm before they execute.
          </p>
          <button
            type="button"
            onClick={() => setNewModalOpen(true)}
            className="flex shrink-0 items-center gap-2 bg-[#C5FF4A] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New strategy
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {strategies.map((s, idx) => (
            <button
              key={`${s.name}-${idx}`}
              type="button"
              onClick={() => setSelectedStrategy(s)}
              className="flex flex-col border border-[#262626] bg-[#141414] p-5 text-left transition-colors hover:border-[#C5FF4A]/30 hover:bg-[#171717]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-[#C5FF4A]" />
                  <h2 className="font-bold text-white">{s.name}</h2>
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
            </button>
          ))}
        </div>
      </div>

      <NewStrategyModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSave={handleSave}
      />

      <StrategyDetailModal
        strategy={selectedStrategy}
        onClose={() => setSelectedStrategy(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
