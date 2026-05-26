import { useMemo } from 'react';
import { Label, Pie, PieChart } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { truncateHex } from '@/lib/truncate-hex';
import { useDepositorsChartData } from '@/depositors-chart/depositors-chart.hooks';
import type { Address } from 'viem';

export const DepositorsChartDisplay = () => {
  const chartData = useDepositorsChartData();

  const { pieData, chartConfig } = useMemo(() => {
    if (!chartData) {
      return { pieData: [], chartConfig: {} };
    }

    // Create pie data with depositors and others
    const depositorPieData = chartData.chartData.map((item, index) => ({
      name: truncateHex(item.depositorAddress),
      value: item.percentage,
      fill: item.fill,
      address: item.depositorAddress,
    }));

    // Add "others" slice if there's remaining percentage
    const pieData = [...depositorPieData];
    if (chartData.othersPercentage > 0) {
      pieData.push({
        name: 'Others',
        value: chartData.othersPercentage,
        fill: 'var(--muted-foreground)',
        address: '' as Address,
      });
    }

    // Create chart config
    const chartConfig: ChartConfig = {
      percentage: {
        label: 'Percentage',
      },
      ...chartData.chartData.reduce((acc, item, index) => {
        acc[truncateHex(item.depositorAddress)] = {
          label: truncateHex(item.depositorAddress),
          color: item.fill,
        };
        return acc;
      }, {} as ChartConfig),
      others: {
        label: 'Others',
        color: 'var(--chart-5)',
      },
    };

    return { pieData, chartConfig };
  }, [chartData]);

  if (!chartData) {
    return null;
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Depositors Distribution</CardTitle>
        <CardDescription>
          Share of each depositor in total vault TVL
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {chartData.totalActiveDepositors.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Depositors
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
