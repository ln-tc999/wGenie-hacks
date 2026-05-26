'use client';

import { AppProviders } from '@/app/app-providers';
import { GlobalFlowChart } from '@/flow-chart/global-flow-chart';

export const DashboardContent = () => {
  return (
    <AppProviders>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Protocol overview across all vaults and chains
          </p>
        </div>
        <GlobalFlowChart />
      </div>
    </AppProviders>
  );
};
