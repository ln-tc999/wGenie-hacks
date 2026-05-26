'use client';

import { FlowChartTooltip } from './components/flow-chart-tooltip';
import { FlowChartDisplay } from './components/flow-chart-display';
import { useFlowChartContext, FlowChartContext } from './flow-chart.context';
import { useFlowChartParams } from '@/flow-chart/flow-chart.params';
import { useFlowChartData } from '@/flow-chart/flow-chart.hooks';
import { FlowChartLoader } from './components/flow-chart-loader';
import { FlowChartNoData } from './components/flow-chart-no-data';

export const FlowChart = () => {
  const params = useFlowChartParams();

  return (
    <FlowChartContext.Provider
      value={{
        params,
      }}
    >
      <FlowChartContent />
    </FlowChartContext.Provider>
  );
};

export const FlowChartContent = () => {
  const {
    params: { isLoading, timeRange, setTimeRange },
  } = useFlowChartContext();

  const transformedData = useFlowChartData();

  if (isLoading) return <FlowChartLoader />;

  if (!transformedData || transformedData.length === 0) {
    return <FlowChartNoData />;
  }

  return (
    <FlowChartDisplay
      data={transformedData}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      tooltipContent={<FlowChartTooltip />}
    />
  );
};
