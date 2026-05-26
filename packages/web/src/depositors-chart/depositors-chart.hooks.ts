import { useDepositorsChartContext } from '@/depositors-chart/depositors-chart.context';
import { useMemo } from 'react';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export const useDepositorsChartData = () => {
  const {
    params: { depositorsData, metricsData },
  } = useDepositorsChartContext();

  const depositors = depositorsData?.depositors;
  const metrics = metricsData?.metrics;
  const totalShareBalance = metrics?.totalShareBalance;

  const chartData = useMemo(() => {
    if (!depositors || !totalShareBalance || !metrics?.activeDepositors) {
      return null;
    }

    // Calculate percentages for each depositor based on share balances
    // Since convertToAssets is linear, the percentage is the same for shares and assets
    const depositorsWithPercentages = depositors.map((depositor, index) => {
      const percentage =
        Number((depositor.shareBalance * 10000n) / totalShareBalance) / 100; // Convert to percentage with 2 decimal precision

      return {
        depositorAddress: depositor.address,
        shareBalance: depositor.shareBalance,
        assetBalance: 0n, // We'll calculate this for display if needed
        percentage,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    // Calculate total percentage shown in chart
    const totalShownPercentage = depositorsWithPercentages.reduce(
      (sum, item) => sum + item.percentage,
      0,
    );

    // Others percentage is the remaining
    const othersPercentage = Math.max(0, 100 - totalShownPercentage);

    return {
      chartData: depositorsWithPercentages,
      othersPercentage,
      totalActiveDepositors: metrics.activeDepositors,
    };
  }, [depositors, totalShareBalance, metrics?.activeDepositors]);

  return chartData;
};
