'use client';

import { useState } from 'react';
import { fromUnixTime } from 'date-fns';
import { FlowChartDisplay } from './components/flow-chart-display';
import { FlowChartLoader } from './components/flow-chart-loader';
import { FlowChartNoData } from './components/flow-chart-no-data';
import { GlobalFlowChartTooltip } from './components/global-flow-chart-tooltip';
import { useGlobalFlowChartQuery } from './queries/use-global-flow-chart-query';
import { formatChartDate } from './flow-chart.utils';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import type { FlowChartDataItem, TimeRange } from './flow-chart.types';

export const GlobalFlowChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { data, isLoading } = useGlobalFlowChartQuery(timeRange);

  if (isLoading) return <FlowChartLoader />;

  const chartData = data?.flowChart.chartData;
  if (!chartData || chartData.length === 0) return <FlowChartNoData />;

  const transformedData = chartData.reduce<FlowChartDataItem[]>(
    (acc, item) => {
      const lastItem = acc.at(-1);
      const inflow = item.depositUsd;
      const outflow = -item.withdrawUsd;
      const thisNetFlow = inflow + outflow;

      return [
        ...acc,
        {
          date: formatChartDate(fromUnixTime(item.bucketId), timeRange),
          inflow,
          outflow,
          netFlow: (lastItem?.netFlow || 0) + thisNetFlow,
        },
      ];
    },
    [],
  );

  return (
    <FlowChartDisplay
      data={transformedData}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      tooltipContent={<GlobalFlowChartTooltip />}
      yAxisFormatter={(value) => `$${formatNumberWithSuffix(value)}`}
    />
  );
};
