import { useFlowChartContext } from '@/flow-chart/flow-chart.context';
import { fromUnixTime } from 'date-fns';
import { formatChartDate } from '@/flow-chart/flow-chart.utils';
import type { FlowChartDataItem } from '@/flow-chart/flow-chart.types';
import { useVaultContext } from '@/vault/vault.context';
import { formatUnits } from 'viem';

export const useFlowChartData = () => {
  const {
    params: { data, timeRange },
  } = useFlowChartContext();
  const { assetDecimals } = useVaultContext();

  const chartData = data?.flowChart.chartData;

  if (!chartData || chartData.length === 0) return undefined;
  if (assetDecimals === undefined) return undefined;

  const transformedData = chartData.reduce<FlowChartDataItem[]>(
    (acc: FlowChartDataItem[], item: (typeof chartData)[0]) => {
      const lastItem = acc.at(-1);

      const inflow = Number(formatUnits(item.deposit.sum, assetDecimals));
      const outflow = -Number(formatUnits(item.withdraw.sum, assetDecimals));
      const thisItemNetFlow = inflow + outflow;

      return [
        ...acc,
        {
          date: formatChartDate(fromUnixTime(item.bucketId), timeRange),
          inflow,
          outflow,
          netFlow: (lastItem?.netFlow || 0) + thisItemNetFlow,
        },
      ];
    },
    [],
  );

  return transformedData;
};
