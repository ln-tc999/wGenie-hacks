'use client';

import { AppProviders } from '@/app/app-providers';
import { GlobalFlowChart } from '@/flow-chart/global-flow-chart';

export const DashboardFlowChart = () => (
  <AppProviders>
    <GlobalFlowChart />
  </AppProviders>
);
