'use client';

import { VaultMetrics } from '@/vault-metrics/vault-metrics';

export const VaultOverviewContent = () => {
  return (
    <div className="space-y-6">
      <VaultMetrics />
    </div>
  );
};
