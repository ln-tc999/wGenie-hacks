'use client';

import { DepositorsChart } from '@/depositors-chart/depositors-chart';
import { DepositorsList } from '@/depositors-list/depositors-list';

export const VaultDepositorsContent = () => {
  return (
    <div className="space-y-6">
      <DepositorsChart />
      <DepositorsList />
    </div>
  );
};
