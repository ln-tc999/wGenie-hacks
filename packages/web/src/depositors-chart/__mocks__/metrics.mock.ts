import { vaultMetricsResponseSchema } from '@/vault-metrics/queries/use-vault-metrics-query';

const metricsMockRaw = {
  metrics: {
    totalShareBalance: '323085761344104',
    activeDepositors: '442',
    allTimeDepositors: '708',
    firstDeposit: 1741033273,
  },
};

export const metricsMock = vaultMetricsResponseSchema.parse(metricsMockRaw);
