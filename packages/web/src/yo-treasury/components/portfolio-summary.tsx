'use client';

import type { Address } from 'viem';
import { Wallet, TrendingUp, Layers, Shield } from 'lucide-react';
import { useTotalTvl } from '@yo-protocol/react';
import type { TreasuryPosition } from '../hooks/use-treasury-positions';
import { useAlphaRole } from '../hooks/use-alpha-role';

const ACCESS_MANAGER_URL =
  'https://app.wGenie.io/fusion/base/0x09d1c2e03f73853916ee86b4e1a729f9fbaa960d/edit/access-manager';

interface Props {
  positions: TreasuryPosition[];
  prices: Record<string, number>;
  isLoading: boolean;
  chainId: number;
  vaultAddress: Address;
  userAddress: Address | undefined;
}

function formatUsd(value: number): string {
  if (value < 0.01 && value > 0) return '<$0.01';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="relative bg-yo-dark rounded-lg p-4 border border-white/5 overflow-hidden group">
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-yo-neon/[0.02]" />

      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${accent ? 'bg-yo-neon/10' : 'bg-white/5'}`}>
          <Icon className={`w-3.5 h-3.5 ${accent ? 'text-yo-neon' : 'text-yo-muted'}`} />
        </div>
        <span className="text-[11px] font-medium tracking-wider uppercase text-yo-muted">
          {label}
        </span>
      </div>

      <div className={`text-xl font-semibold tracking-tight ${accent ? 'text-yo-neon' : 'text-white'}`}>
        {value}
      </div>

      {subValue && (
        <div className="text-xs text-yo-muted mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

export function PortfolioSummary({
  positions,
  prices,
  isLoading,
  chainId,
  vaultAddress,
  userAddress,
}: Props) {
  const { hasAlphaRole, isLoading: isRoleLoading, isConnected } = useAlphaRole({
    chainId,
    vaultAddress,
    userAddress,
  });
  const { tvl: totalTvlData } = useTotalTvl();
  const protocolTvl = totalTvlData?.length
    ? totalTvlData[totalTvlData.length - 1]
    : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-yo-dark rounded-lg p-4 border border-white/5 animate-pulse"
          >
            <div className="h-3 w-16 bg-white/5 rounded mb-3" />
            <div className="h-6 w-24 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Sum allocated and unallocated USD across ALL positions using per-token prices
  let allocatedUsd = 0;
  let unallocatedUsd = 0;

  for (const pos of positions) {
    const price = prices[pos.underlyingAddress.toLowerCase()];
    if (price) {
      if (pos.shares > 0n) {
        allocatedUsd += Number(pos.assetsFormatted) * price;
      }
      unallocatedUsd += Number(pos.unallocatedFormatted) * price;
    }
  }

  const totalUsd = allocatedUsd + unallocatedUsd;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Total Value"
        value={formatUsd(totalUsd)}
        subValue={protocolTvl
          ? `YO Protocol TVL: $${(parseFloat(protocolTvl.tvlUsd) / 1_000_000).toFixed(1)}M`
          : 'treasury holdings'}
        icon={Wallet}
        accent
      />
      <StatCard
        label="Allocated"
        value={allocatedUsd > 0 ? formatUsd(allocatedUsd) : '$0.00'}
        subValue="earning yield"
        icon={TrendingUp}
      />
      <StatCard
        label="Unallocated"
        value={formatUsd(unallocatedUsd)}
        subValue="idle funds"
        icon={Layers}
      />
      <div className="relative bg-yo-dark rounded-lg p-4 border border-white/5 overflow-hidden group">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-yo-neon/[0.02]" />
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-md ${isConnected && hasAlphaRole ? 'bg-yo-neon/10' : 'bg-white/5'}`}>
            <Shield className={`w-3.5 h-3.5 ${isConnected && hasAlphaRole ? 'text-yo-neon' : 'text-yo-muted'}`} />
          </div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-yo-muted">
            Alpha Role
          </span>
        </div>
        <div className={`text-xl font-semibold tracking-tight ${
          !isConnected ? 'text-yo-muted'
            : isRoleLoading ? 'text-yo-muted'
            : hasAlphaRole ? 'text-yo-neon'
            : 'text-white'
        }`}>
          {!isConnected
            ? 'Connect wallet'
            : isRoleLoading
              ? '...'
              : hasAlphaRole
                ? 'Granted'
                : 'Not Granted'}
        </div>
        <a
          href={ACCESS_MANAGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-yo-muted hover:text-yo-neon transition-colors mt-0.5 inline-block"
        >
          Manage roles &rarr;
        </a>
      </div>
    </div>
  );
}
