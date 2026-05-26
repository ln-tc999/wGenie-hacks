import { getAppConfig } from '@/lib/app-config';
import { fetchDashboardMetrics } from '@/dashboard/fetch-dashboard-metrics';
import { fetchDashboardRankings } from '@/dashboard/fetch-dashboard-rankings';
import { DashboardMetrics } from '@/dashboard/components/dashboard-metrics';
import { DashboardFlowChart } from '@/dashboard/dashboard-flow-chart';
import { DashboardVaultRankings } from '@/dashboard/components/dashboard-vault-rankings';
import { DashboardLargestTransactions } from '@/dashboard/components/dashboard-largest-transactions';
import { DashboardTopDepositors } from '@/dashboard/components/dashboard-top-depositors';
import { YoLandingPage } from '@/yo-treasury/components/yo-landing-page';

export default async function DashboardPage() {
  const config = getAppConfig();

  if (config.id === 'yo') {
    return <YoLandingPage />;
  }

  const [metrics, rankings] = await Promise.all([
    fetchDashboardMetrics(),
    fetchDashboardRankings(),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Protocol overview across all vaults and chains
        </p>
      </div>
      <DashboardMetrics metrics={metrics} />
      <DashboardFlowChart />
      <DashboardVaultRankings
        topVaults={rankings.topVaults}
        bottomVaults={rankings.bottomVaults}
      />
      <DashboardLargestTransactions
        largestDeposits={rankings.largestDeposits}
        largestWithdrawals={rankings.largestWithdrawals}
      />
      <DashboardTopDepositors depositors={rankings.topDepositors} />
    </div>
  );
}
