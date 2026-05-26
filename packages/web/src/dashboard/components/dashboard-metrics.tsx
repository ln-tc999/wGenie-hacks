import {
  DollarSignIcon,
  LayersIcon,
  UsersIcon,
  TrendingUpIcon,
  ActivityIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumberWithSuffix } from '@/lib/format-number-with-suffix';
import type { DashboardMetrics as DashboardMetricsData } from '@/dashboard/fetch-dashboard-metrics';

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  valueClassName?: string;
}

const MetricCard = ({
  title,
  value,
  description,
  icon,
  valueClassName = 'text-foreground',
}: MetricCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{title}</span>
        {icon}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold mb-1 ${valueClassName}`}>{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export const DashboardMetrics = ({
  metrics,
}: {
  metrics: DashboardMetricsData;
}) => {
  const netFlowSign = metrics.netFlow7dUsd >= 0 ? '+' : '-';
  const netFlowColor =
    metrics.netFlow7dUsd >= 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <MetricCard
        title="Total Value Locked"
        value={`$${formatNumberWithSuffix(metrics.totalTvlUsd)}`}
        description="Across all vaults"
        icon={<DollarSignIcon className="h-4 w-4" />}
      />
      <MetricCard
        title="Total Vaults"
        value={metrics.totalVaults.toLocaleString()}
        description="Active plasma vaults"
        icon={<LayersIcon className="h-4 w-4" />}
      />
      <MetricCard
        title="Active Depositors"
        value={metrics.activeDepositors.toLocaleString()}
        description="Unique addresses with position"
        icon={<UsersIcon className="h-4 w-4" />}
      />
      <MetricCard
        title="7d Net Flow"
        value={`${netFlowSign}$${formatNumberWithSuffix(Math.abs(metrics.netFlow7dUsd))}`}
        description="Deposits minus withdrawals"
        icon={<TrendingUpIcon className="h-4 w-4" />}
        valueClassName={netFlowColor}
      />
      <MetricCard
        title="7d Volume"
        value={`$${formatNumberWithSuffix(metrics.volume7dUsd)}`}
        description="Total deposits + withdrawals"
        icon={<ActivityIcon className="h-4 w-4" />}
      />
    </div>
  );
};
