import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { TimeRange } from '../flow-chart.types';

export const globalFlowChartSchema = z.object({
  flowChart: z.object({
    chartData: z.array(
      z.object({
        bucketId: z.number(),
        depositUsd: z.number(),
        withdrawUsd: z.number(),
      }),
    ),
  }),
});

const fetchGlobalFlowChart = async (timeRange: TimeRange) => {
  const params = new URLSearchParams({ timeRange });
  const response = await fetch(
    `/api/global/flow-chart?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch global flow chart: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return globalFlowChartSchema.parse(data);
};

export const useGlobalFlowChartQuery = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ['globalFlowChart', timeRange],
    queryFn: () => fetchGlobalFlowChart(timeRange),
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    placeholderData: keepPreviousData,
  });
};
