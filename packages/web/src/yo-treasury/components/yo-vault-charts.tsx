'use client';

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeseriesPoint } from '@yo-protocol/core';

interface Props {
  yieldHistory: TimeseriesPoint[] | undefined;
  tvlHistory: TimeseriesPoint[] | undefined;
  isLoading: boolean;
}

function formatDate(timestamp: number): string {
  // API may return seconds or milliseconds — normalize
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTvlValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatYieldValue(value: number): string {
  return `${value.toFixed(2)}%`;
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[10px] text-muted-foreground mb-1">
        {formatDate(label)}
      </p>
      <p className="text-sm font-mono font-medium text-foreground">
        {formatter(payload[0].value)}
      </p>
    </div>
  );
}

export function YoVaultCharts({
  yieldHistory,
  tvlHistory,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const hasTvl = tvlHistory && tvlHistory.length > 0;
  const hasYield = yieldHistory && yieldHistory.length > 0;

  if (!hasTvl && !hasYield) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* TVL History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            TVL History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasTvl ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={tvlHistory}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="tvlGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-1)"
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
                    tickFormatter={formatTvlValue}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    content={<CustomTooltip formatter={formatTvlValue} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#tvlGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: 'var(--chart-1)',
                      strokeWidth: 0,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
              No TVL data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yield History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Yield History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasYield ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={yieldHistory}
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
                    tickFormatter={formatYieldValue}
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    content={<CustomTooltip formatter={formatYieldValue} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: 'var(--chart-2)',
                      strokeWidth: 0,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
              No yield data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
