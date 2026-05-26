'use client';

import { YieldProvider } from '@yo-protocol/react';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';
import { useYoVaultDetail } from '../hooks/use-yo-vault-detail';
import { YoVaultMetrics } from './yo-vault-metrics';
import { YoVaultCharts } from './yo-vault-charts';
import { YoSharePriceChart } from './yo-share-price-chart';
import { YoPerformanceBenchmark } from './yo-performance-benchmark';
import { YoMerklRewards } from './yo-merkl-rewards';
import { YoUserSnapshots } from './yo-user-snapshots';

const PARTNER_ID = Number(process.env.NEXT_PUBLIC_YO_PARTNER_ID) || 9999;

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function YoVaultOverview({ chainId, vaultAddress }: Props) {
  return (
    <YieldProvider partnerId={PARTNER_ID} defaultSlippageBps={50}>
      <YoVaultOverviewContent chainId={chainId} vaultAddress={vaultAddress} />
    </YieldProvider>
  );
}

function YoVaultOverviewContent({ chainId, vaultAddress }: Props) {
  const detail = useYoVaultDetail(chainId, vaultAddress);

  return (
    <div className="space-y-6">
      <YoVaultMetrics
        snapshot={detail.snapshot}
        performance={detail.performance}
        vaultAddress={vaultAddress}
        isLoading={detail.isLoading}
      />
      <YoVaultCharts
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
