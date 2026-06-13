'use client';

import { TrendingUp, TrendingDown, ArrowUpRight, Loader2 } from 'lucide-react';
import { TreasuryChart } from '@/wgenie-cfo/components/dashboard/treasury-chart';
import { useTreasury } from '@/wgenie-cfo/components/dashboard/treasury-provider';
import { TREASURY } from '@/wgenie-cfo/components/dashboard/mock-data';
import { getTextColorForBg } from '@/lib/utils';

export default function TreasuryPage() {
  const { totalValueUsd, mntBalanceFormatted, positions, loading } = useTreasury();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#8E8E8E]" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-px border border-[#262626] bg-[#262626] md:grid-cols-4">
        <div className="bg-[#141414] px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-[#8E8E8E]">Total value</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            ${totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#141414] px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-[#8E8E8E]">MNT Balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {Number(mntBalanceFormatted).toFixed(4)}
          </p>
        </div>
        <div className="bg-[#141414] px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-[#8E8E8E]">Positions</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{positions.length}</p>
        </div>
        <div className="bg-[#141414] px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-[#8E8E8E]">Network</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">Mantle</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Positions table */}
        <div className="border border-[#262626] bg-[#141414] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#262626] p-5">
            <h2 className="text-lg font-bold text-white">Open positions</h2>
            <span className="font-mono text-xs text-[#8E8E8E]">
              {TREASURY.address.slice(0, 6)}…{TREASURY.address.slice(-4)}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-2 border-b border-[#262626] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8E8E8E]">
            <div className="col-span-5">Protocol / Asset</div>
            <div className="col-span-3 text-right">Value</div>
            <div className="col-span-2 text-right">APY</div>
            <div className="col-span-2 text-right">24h</div>
          </div>

          {positions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#8E8E8E]">
              No open positions. Deposit tokens to the treasury to get started.
            </div>
          ) : (
            positions.map((p) => {
              const up = p.changePct >= 0;
              return (
                <div
                  key={p.protocol}
                  className="grid grid-cols-12 items-center gap-2 border-b border-[#262626] px-5 py-4 last:border-b-0 transition-colors hover:bg-[#171717]"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <span
                      className={`flex size-9 items-center justify-center rounded-full text-[10px] font-bold ${getTextColorForBg(p.color)}`}
                      style={{ backgroundColor: p.color }}
                    >
                      {p.asset.slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{p.protocol}</p>
                      <p className="truncate text-xs text-[#8E8E8E]">{p.asset}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="font-bold tabular-nums text-white">{p.valueLabel}</p>
                    <p className="text-xs tabular-nums text-[#8E8E8E]">{p.amountLabel}</p>
                  </div>
                  <div className="col-span-2 text-right font-bold tabular-nums text-[#C5FF4A]">
                    {p.apyLabel}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 text-sm font-medium tabular-nums">
                    {up ? (
                      <TrendingUp className="size-3.5 text-[#C5FF4A]" />
                    ) : (
                      <TrendingDown className="size-3.5 text-red-400" />
                    )}
                    {up ? '+' : ''}{p.changePct}%
                  </div>
                </div>
              );
            })
          )}

          <a
            href={`https://explorer.sepolia.mantle.xyz/address/${TREASURY.address}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 border-t border-[#262626] px-5 py-4 text-xs font-bold text-[#8E8E8E] transition-colors hover:text-white"
          >
            View vault on explorer
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>

        {/* Chart */}
        <div className="lg:col-span-5">
          <TreasuryChart />
        </div>
      </div>
    </div>
  );
}
