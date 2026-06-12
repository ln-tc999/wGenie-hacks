'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { Coins, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { useTreasury } from './treasury-provider';
import { TREASURY } from './mock-data';

type DataPoint = { time: string; value: number };

const RechartsChart = dynamic(() => import('./recharts-chart').then(m => m.RechartsChart), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[300px] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-[#8E8E8E]" />
    </div>
  ),
});

export function TreasuryChart() {
  const { totalValueUsd } = useTreasury();
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      try {
        const res = await fetch(
          `/api/vaults/${TREASURY.chainId}/${TREASURY.address}/flow-chart?timeRange=7d`,
        );
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const chartData = json.flowChart?.chartData;
        if (chartData?.length > 0) {
          setData(chartData.map((d: any) => ({
            time: `b${d.bucketId}`,
            value: (Number(d.deposit?.sum || 0) - Number(d.withdraw?.sum || 0)) / 1e18,
          })));
        }
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  }, []);

  return (
    <div className="flex flex-col border border-[#262626] bg-[#141414] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Treasury value</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center gap-2 border border-[#262626] bg-[#0D0D0D] px-3 py-1.5 text-xs text-white"
          >
            <Coins className="size-4 text-[#8E8E8E]" />
            All assets
            <ChevronDown className="size-3 text-[#8E8E8E]" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 border border-[#262626] bg-[#0D0D0D] px-3 py-1.5 text-xs text-white"
          >
            <Calendar className="size-4 text-[#8E8E8E]" />
            7d
            <ChevronDown className="size-3 text-[#8E8E8E]" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#8E8E8E]" />
        </div>
      ) : (
        <Suspense fallback={<div className="flex min-h-[300px] items-center justify-center"><Loader2 className="size-6 animate-spin text-[#8E8E8E]" /></div>}>
          <RechartsChart data={data} totalValueUsd={totalValueUsd} />
        </Suspense>
      )}
    </div>
  );
}
