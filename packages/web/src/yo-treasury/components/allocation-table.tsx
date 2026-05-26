'use client';

import Link from 'next/link';
import { useUserPerformance } from '@yo-protocol/react';
import type { Address } from 'viem';
import type { TreasuryPosition } from '../hooks/use-treasury-positions';
import type { YoVaultData } from '../hooks/use-yo-vaults-data';

interface Props {
  chainId: number;
  positions: TreasuryPosition[];
  vaultsData: YoVaultData[] | undefined;
  prices: Record<string, number>;
  isLoading: boolean;
}

function formatApy(apy: string | null): string {
  if (!apy) return '—';
  const num = parseFloat(apy);
  if (isNaN(num)) return '—';
  return `${num.toFixed(2)}%`;
}

function formatUsd(value: number): string {
  if (value < 0.01 && value > 0) return '<$0.01';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAssetAmount(value: number, decimals: number, symbol: string): string {
  if (value === 0) return '—';
  const dp = decimals <= 6 ? 2 : decimals === 8 ? 4 : 6;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })} ${symbol}`;
}

function formatCompactAsset(value: number, symbol: string): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${symbol}`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(0)}K ${symbol}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K ${symbol}`;
  const dp = value < 1 ? 4 : 2;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: dp })} ${symbol}`;
}

function VaultRowPerformance({ vaultAddress }: { vaultAddress: Address }) {
  const { performance } = useUserPerformance(vaultAddress);
  if (!performance?.unrealized?.formatted) return <span className="text-yo-muted">—</span>;
  return (
    <span className="font-mono text-xs text-yo-neon">
      {performance.unrealized.formatted}
    </span>
  );
}

function VaultDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

export function AllocationTable({ chainId, positions, vaultsData, prices, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-yo-dark rounded-lg border border-white/5 p-4">
        <div className="h-4 w-32 bg-white/5 rounded mb-4 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Merge on-chain positions with YO vault API data
  const rows = positions.map((pos) => {
    const vaultData = vaultsData?.find(
      (v) => v.vaultAddress.toLowerCase() === pos.vaultAddress.toLowerCase(),
    );
    return {
      ...pos,
      apy7d: vaultData?.apy7d ?? null,
      tvlAmount: vaultData?.tvlAmount ?? null,
    };
  });

  const hasAnyPosition = rows.some((r) => r.shares > 0n || r.unallocatedBalance > 0n);

  return (
    <div className="bg-yo-dark rounded-lg border border-white/5 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-xs font-medium tracking-wider uppercase text-yo-muted">
          Yield Allocations
        </h3>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-yo-muted text-[11px] uppercase tracking-wider">
            <th className="font-medium pb-2 pl-4 text-left">Vault</th>
            <th className="font-medium pb-2 text-right">Unallocated</th>
            <th className="font-medium pb-2 text-right">Position</th>
            <th className="font-medium pb-2 text-right">P&amp;L</th>
            <th className="font-medium pb-2 text-right">APR</th>
            <th className="font-medium pb-2 pr-4 text-right">TVL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isActive = row.shares > 0n;
            const price = prices[row.underlyingAddress.toLowerCase()];

            // Position
            const positionAmount = Number(row.assetsFormatted);
            const positionUsd = price ? positionAmount * price : null;

            // Unallocated
            const unallocAmount = Number(row.unallocatedFormatted);
            const unallocUsd = price ? unallocAmount * price : null;

            return (
              <tr
                key={row.vaultId}
                className={`border-t border-white/5 transition-colors ${
                  isActive ? 'bg-white/[0.02]' : ''
                }`}
              >
                {/* Vault */}
                <td className="py-3 pl-4">
                  <Link
                    href={`/vaults/${chainId}/${row.vaultAddress}`}
                    className="group/vault flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <VaultDot color={row.color} />
                    <img
                      src={row.logo}
                      alt={row.vaultName}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="font-medium text-white group-hover/vault:underline">
                      {row.vaultName}
                    </span>
                    <span className="text-yo-muted text-xs">
                      {row.underlying}
                    </span>
                  </Link>
                </td>

                {/* Unallocated */}
                <td className="py-3 text-right">
                  <div className="font-mono text-xs text-white">
                    {unallocAmount > 0
                      ? formatAssetAmount(unallocAmount, row.underlyingDecimals, row.underlying)
                      : '—'}
                  </div>
                  {unallocAmount > 0 && unallocUsd !== null && (
                    <div className="font-mono text-[10px] text-yo-muted">
                      {formatUsd(unallocUsd)}
                    </div>
                  )}
                </td>

                {/* Position */}
                <td className="py-3 text-right">
                  <div
                    className={`font-mono text-xs ${
                      isActive ? 'text-white' : 'text-yo-muted'
                    }`}
                  >
                    {isActive
                      ? formatAssetAmount(positionAmount, row.underlyingDecimals, row.underlying)
                      : '—'}
                  </div>
                  {isActive && positionUsd !== null && (
                    <div className="font-mono text-[10px] text-yo-muted">
                      {formatUsd(positionUsd)}
                    </div>
                  )}
                </td>

                {/* P&L */}
                <td className="py-3 text-right">
                  <VaultRowPerformance vaultAddress={row.vaultAddress as Address} />
                </td>

                {/* APR */}
                <td className="py-3 text-right">
                  <span className="font-mono font-medium text-yo-neon">
                    {formatApy(row.apy7d)}
                  </span>
                </td>

                {/* TVL */}
                <td className="py-3 pr-4 text-right">
                  <div className="font-mono text-xs text-white">
                    {row.tvlAmount !== null
                      ? formatCompactAsset(row.tvlAmount, row.underlying)
                      : '—'}
                  </div>
                  {row.tvlAmount !== null && price && (
                    <div className="font-mono text-[10px] text-yo-muted">
                      {formatUsd(row.tvlAmount * price)}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!hasAnyPosition && (
        <div className="px-4 pb-4 pt-2 text-center">
          <p className="text-xs text-yo-muted">
            No allocations yet. Use the AI copilot below to allocate funds to YO vaults.
          </p>
        </div>
      )}
    </div>
  );
}
