'use client';

import { useUserSnapshots } from '@yo-protocol/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';

interface Props {
  vaultAddress: Address;
}

function formatDate(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(2)}`;
}

export function YoUserSnapshots({ vaultAddress }: Props) {
  const { address } = useAccount();
  const { snapshots, isLoading } = useUserSnapshots(vaultAddress, address);

  if (!address) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshots || snapshots.length < 2) return null;

  const chartData = snapshots.map((s) => ({
    timestamp: s.timestamp,
    value: parseFloat(String(s.assetBalanceUsd)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Your Position History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="userSnapshotGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#D6FF34" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#D6FF34" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tickFormatter={formatUsd}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {formatDate(label as number)}
                      </p>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {formatUsd(Number(payload[0].value))}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#D6FF34"
                strokeWidth={2}
                fill="url(#userSnapshotGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#D6FF34', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
