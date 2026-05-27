'use client';

import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';
import { useMantleVaultDetail } from '../hooks/use-vault-detail';
import { MantleVaultMetrics } from './vault-metrics';
import { MantleVaultCharts } from './vault-charts';
import { YoSharePriceChart } from './share-price-chart';
import { YoPerformanceBenchmark } from './performance-benchmark';
import { YoMerklRewards } from './merkl-rewards';
import { YoUserSnapshots } from './user-snapshots';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function MantleVaultOverview({ chainId, vaultAddress }: Props) {
  const detail = useMantleVaultDetail(chainId, vaultAddress);

  return (
    <div className="space-y-6">
      <MantleVaultMetrics
        snapshot={detail.snapshot}
        performance={detail.performance}
        vaultAddress={vaultAddress}
        isLoading={detail.isLoading}
      />
      <MantleVaultCharts
        yieldHistory={detail.yieldHistory}
        tvlHistory={detail.tvlHistory}
        isLoading={detail.isChartsLoading}
      />
      <YoSharePriceChart
        history={detail.sharePriceHistory}
        isLoading={detail.isChartsLoading}
      />
      <YoPerformanceBenchmark vaultAddress={vaultAddress} />
      <YoMerklRewards />
      <YoUserSnapshots vaultAddress={vaultAddress} />
    </div>
  );
}
