'use client';

import { usePendingRedemptions } from '@yo-protocol/react';
import { Clock } from 'lucide-react';
import type { Address } from 'viem';

interface Props {
  vaultAddress: Address;
}

export function PendingRedemptionBanner({ vaultAddress }: Props) {
  const { pendingRedemptions, isLoading } = usePendingRedemptions(vaultAddress);

  if (isLoading || !pendingRedemptions) return null;

  const hasAssets = pendingRedemptions.assets && Number(pendingRedemptions.assets.raw) > 0;
  const hasShares = pendingRedemptions.shares && Number(pendingRedemptions.shares.raw) > 0;

  if (!hasAssets && !hasShares) return null;

  return (
    <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20 space-y-1.5">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="text-xs font-medium text-yellow-400">Pending Redemption</span>
      </div>
      <div className="space-y-0.5 pl-[22px]">
        {hasAssets && (
          <p className="text-[11px] text-yellow-400/80 font-mono">
            {pendingRedemptions.assets!.formatted} assets queued
          </p>
        )}
        {hasShares && (
          <p className="text-[11px] text-yellow-400/80 font-mono">
            {pendingRedemptions.shares!.formatted} shares queued
          </p>
        )}
      </div>
    </div>
  );
}
