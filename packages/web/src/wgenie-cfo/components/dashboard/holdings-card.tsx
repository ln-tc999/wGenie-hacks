'use client';

import { MoreVertical, ArrowUpRight, Loader2 } from 'lucide-react';
import { useTreasury } from './treasury-provider';
import { getTextColorForBg } from '@/lib/utils';

export function HoldingsCard() {
  const { positions, totalValueUsd, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center border border-[#262626] bg-[#141414] p-4">
        <Loader2 className="size-6 animate-spin text-[#8E8E8E]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border border-[#262626] bg-[#141414] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Treasury holdings</h2>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-[#262626] px-3 py-1 text-xs text-[#8E8E8E] transition-colors hover:text-white"
        >
          Go to Treasury
          <ArrowUpRight className="size-3" />
        </button>
      </div>

      {/* Token cards */}
      <div className="mb-4 grid grid-cols-1 gap-4">
        {positions.map((p) => (
          <div
            key={p.asset}
            className="flex items-center gap-4 border border-[#262626] p-3"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-full text-xs font-bold ${getTextColorForBg(p.color)}`}
              style={{ backgroundColor: p.color }}
            >
              {p.asset.slice(0, 3)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-white">
                {p.asset}
                <span className="ml-1 text-sm text-[#8E8E8E]">{p.protocol}</span>
              </p>
              <p className="text-xs text-[#8E8E8E]">{p.amountLabel} tokens</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums text-white">{p.valueLabel}</p>
            </div>
            <button
              type="button"
              aria-label="More"
              className="ml-2 text-[#8E8E8E] transition-colors hover:text-white"
            >
              <MoreVertical className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {/* If no positions */}
      {positions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-sm text-[#8E8E8E]">
          No tokens yet — deposit to the treasury first.
        </div>
      )}
    </div>
  );
}
