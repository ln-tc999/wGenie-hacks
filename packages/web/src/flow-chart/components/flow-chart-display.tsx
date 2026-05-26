'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_COLORS, CHART_CONFIG } from '../flow-chart.utils';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import { FlowChartTimeRangePicker } from './flow-chart-time-range-picker';
import type { FlowChartDataItem, TimeRange } from '../flow-chart.types';
import type { ReactElement } from 'react';

interface FlowChartDisplayProps {
  data: FlowChartDataItem[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  tooltipContent: ReactElement;
  yAxisFormatter?: (value: number) => string;
}

export const FlowChartDisplay = ({
  data,
  timeRange,
  onTimeRangeChange,
  tooltipContent,
  yAxisFormatter = (value) => formatNumberWithSuffix(value),
}: FlowChartDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <h3>Flow Analysis</h3>
            <FlowChartTimeRangePicker
              value={timeRange}
              onValueChange={onTimeRangeChange}
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.inflow }}
              />
              <span className="text-muted-foreground">Inflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.outflow }}
              />
              <span className="text-muted-foreground">Outflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.netFlow }}
              />
              <span className="text-muted-foreground">Net Flow</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={CHART_CONFIG.margin}
              stackOffset="sign"
            >
              <CartesianGrid
                strokeDasharray={CHART_CONFIG.strokeDasharray}
                className="stroke-muted"
              />
              <XAxis
                dataKey="date"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                minTickGap={50}
              />
              <YAxis
                yAxisId="left"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={yAxisFormatter}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={yAxisFormatter}
              />
              <Tooltip content={tooltipContent} />
              <ReferenceLine
                yAxisId="left"
                y={0}
                stroke="#374151"
                strokeDasharray="2 2"
              />
              <Bar
                yAxisId="left"
                dataKey="inflow"
                fill={CHART_COLORS.inflow}
                name="Inflow"
                stackId="flow"
              />
              <Bar
                yAxisId="left"
                dataKey="outflow"
                fill={CHART_COLORS.outflow}
                name="Outflow"
                stackId="flow"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netFlow"
                stroke={CHART_COLORS.netFlow}
                strokeWidth={CHART_CONFIG.strokeWidth}
                dot={false}
                activeDot={{
                  r: CHART_CONFIG.activeDotRadius,
                  stroke: CHART_COLORS.netFlow,
                  strokeWidth: CHART_CONFIG.strokeWidth,
                }}
                name="Net Flow"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
