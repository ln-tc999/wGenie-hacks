'use client';

import { usePerformanceBenchmark } from '@yo-protocol/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Address } from 'viem';

interface Props {
  vaultAddress: Address;
}

const POOL_COLORS = ['#627EEA', '#FFAF4F', '#4E6FFF', '#FF6B6B', '#22C55E'];

function formatDate(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function YoPerformanceBenchmark({ vaultAddress }: Props) {
  const { benchmark, isLoading } = usePerformanceBenchmark(vaultAddress);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!benchmark?.vaultPrices?.length) return null;

  // Collect all timestamps
  const timestamps = new Set<number>();
  for (const p of benchmark.vaultPrices) timestamps.add(p.timestamp);
  for (const pool of benchmark.pools ?? []) {
    for (const p of pool.prices) timestamps.add(p.timestamp);
  }

  const sorted = [...timestamps].sort((a, b) => a - b);
  const vaultMap = new Map(
    benchmark.vaultPrices.map((p) => [p.timestamp, p.pricePerShare]),
  );
  const poolMaps = (benchmark.pools ?? []).map(
    (pool) => new Map(pool.prices.map((p) => [p.timestamp, p.pricePerShare])),
  );

  // Normalize to base-100 from first data point
  const vaultBase = vaultMap.get(sorted[0]);
  const poolBases = poolMaps.map((m) => m.get(sorted[0]));

  const chartData = sorted.map((ts) => {
    const point: Record<string, number> = { timestamp: ts };
    const vp = vaultMap.get(ts);
    if (vp !== undefined && vaultBase) {
      point['vault'] =
        (parseFloat(String(vp)) / parseFloat(String(vaultBase))) * 100;
    }
    poolMaps.forEach((m, i) => {
      const pp = m.get(ts);
      if (pp !== undefined && poolBases[i]) {
        point[`pool_${i}`] =
          (parseFloat(String(pp)) / parseFloat(String(poolBases[i]))) * 100;
      }
    });
    return point;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Performance vs DeFi Peers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="text-muted-foreground mb-1">
                        {formatDate(label as number)}
                      </p>
                      {payload.map((p) => (
                        <p
                          key={String(p.dataKey)}
                          style={{ color: p.color }}
                          className="font-mono"
                        >
                          {p.name}: {Number(p.value).toFixed(2)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="vault"
                name={benchmark.vault.name}
                stroke="#D6FF34"
                strokeWidth={2.5}
                dot={false}
              />
              {(benchmark.pools ?? []).map((pool, i) => (
                <Line
                  key={pool.name}
                  type="monotone"
                  dataKey={`pool_${i}`}
                  name={`${pool.protocol} ${pool.name}`}
                  stroke={POOL_COLORS[i % POOL_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
