'use client';

import { useMerklCampaigns, useMerklRewards } from '@yo-protocol/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift } from 'lucide-react';
import { formatUnits } from 'viem';

export function YoMerklRewards() {
  const { campaigns, isLoading: isCampaignsLoading } = useMerklCampaigns();
  const {
    totalClaimable,
    hasClaimable,
    isLoading: isRewardsLoading,
  } = useMerklRewards();

  const isLoading = isCampaignsLoading || isRewardsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter to currently active campaigns (endTimestamp in the future)
  const now = Math.floor(Date.now() / 1000);
  const activeCampaigns =
    campaigns?.filter((c) => c.endTimestamp > now) ?? [];

  if (activeCampaigns.length === 0 && !hasClaimable) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Gift className="h-4 w-4" />
          YO Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasClaimable && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-yo-neon/5 border border-yo-neon/10">
            <div>
              <p className="text-xs text-muted-foreground">
                Claimable Rewards
              </p>
              <p className="text-lg font-semibold text-yo-neon font-mono">
                {totalClaimable > 0n
                  ? `${formatUnits(totalClaimable, 18)} YO`
                  : '—'}
              </p>
            </div>
          </div>
        )}

        {activeCampaigns.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Active Campaigns ({activeCampaigns.length})
            </p>
            <div className="space-y-1.5">
              {activeCampaigns.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-white/[0.02]"
                >
                  <span className="text-foreground truncate">
                    {c.rewardToken?.symbol ?? 'Reward'} Campaign
                  </span>
                  <span className="text-yo-neon shrink-0 ml-2">
                    {c.apr ? `${c.apr.toFixed(1)}% APR` : 'LIVE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
