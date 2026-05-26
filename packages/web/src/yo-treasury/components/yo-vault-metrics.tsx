'use client';

import { TrendingUp, DollarSign, BarChart3, Activity, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVaultPercentile } from '@yo-protocol/react';
import type { VaultSnapshot, VaultPerformance } from '@yo-protocol/core';
import type { Address } from 'viem';

interface Props {
  snapshot: VaultSnapshot | undefined;
  performance: VaultPerformance | undefined;
  vaultAddress: Address;
  isLoading: boolean;
}

function formatApr(yield7d: string | null | undefined): string {
  if (!yield7d) return '—';
  const num = parseFloat(yield7d);
  if (isNaN(num)) return '—';
  return `${num.toFixed(2)}%`;
}

function formatTvl(formatted: string | undefined): string {
  if (!formatted) return '—';
  return formatted;
}

export function YoVaultMetrics({ snapshot, performance, vaultAddress, isLoading }: Props) {
  const { percentile } = useVaultPercentile(vaultAddress);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const apr = formatApr(snapshot?.stats.yield?.['7d']);
  const tvl = formatTvl(snapshot?.stats.tvl?.formatted);
  const sharePrice = snapshot?.stats.sharePrice?.formatted ?? '—';
  const unrealizedReturn = performance?.unrealized?.formatted ?? '—';

  const items = [
    {
      title: '7d APR',
      value: apr,
      description: 'annualized yield',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: 'Total Value Locked',
      value: tvl,
      description: snapshot?.asset?.symbol ?? '',
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: 'Share Price',
      value: sharePrice,
      description: 'per share',
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      title: 'Unrealized Return',
      value: unrealizedReturn,
      description: 'all time',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      title: 'DeFi Ranking',
      value: percentile?.yoRanking
        ? `Top ${percentile.yoRanking}%`
        : '—',
      description: percentile?.pools
        ? `vs ${percentile.pools} DeFi pools`
        : '',
      icon: <Award className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
      {items.map((item) => (
        <Card key={item.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>{item.title}</span>
              {item.icon}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {item.value}
            </div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
