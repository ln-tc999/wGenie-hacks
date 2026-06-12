'use client';

import { ArrowUpRight, TrendingUp, Loader2 } from 'lucide-react';
import { useTreasury } from './treasury-provider';

export function OverviewCard() {
  const { totalValueUsd, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#C5FF4A_0%,#A3E635_100%)] p-6 text-black">
        <Loader2 className="size-6 animate-spin opacity-70" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#C5FF4A_0%,#A3E635_100%)] p-6 text-black">
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold opacity-70">
          Total Treasury Value
        </span>
        <span className="flex size-8 items-center justify-center rounded-full bg-black/10">
          <ArrowUpRight className="size-4" />
        </span>
      </div>

      <div className="mt-8">
        <p className="text-4xl font-bold tracking-tight tabular-nums">
          ${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="size-4" />
          <span className="tabular-nums">Live</span>
          <span className="opacity-60 tabular-nums">
            Mantle Sepolia
          </span>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between border-t border-black/10 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
            Status
          </p>
          <p className="text-2xl font-bold tabular-nums">
            Online
          </p>
        </div>
        <button
          type="button"
          className="bg-black px-4 py-2 text-xs font-bold text-[#C5FF4A] transition-opacity hover:opacity-90"
        >
          Ask the Agent
        </button>
      </div>
    </div>
  );
}
