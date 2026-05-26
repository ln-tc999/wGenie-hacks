'use client';

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
import type { SharePriceHistoryPoint } from '@yo-protocol/core';

interface Props {
  history: SharePriceHistoryPoint[] | undefined;
  isLoading: boolean;
}

interface ChartPoint {
  timestamp: number;
  pricePerShare: number;
}

function formatDate(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSharePrice(value: number): string {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartPoint }>;
  label?: number;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[10px] text-muted-foreground mb-1">
        {formatDate(label)}
      </p>
      <p className="text-sm font-mono font-medium text-foreground">
        {formatSharePrice(payload[0].value)}
      </p>
      <p className="text-[10px] text-muted-foreground">per share</p>
    </div>
  );
}

export function YoSharePriceChart({ history, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) return null;

  const chartData: ChartPoint[] = history.map((p) => ({
    timestamp: p.timestamp,
    pricePerShare: parseFloat(p.pricePerShare),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Share Price History
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
                  id="sharePriceGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--chart-3)"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chart-3)"
                    stopOpacity={0}
                  />
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
                tickFormatter={formatSharePrice}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={60}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pricePerShare"
                stroke="var(--chart-3)"
                strokeWidth={2}
                fill="url(#sharePriceGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: 'var(--chart-3)',
                  strokeWidth: 0,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
