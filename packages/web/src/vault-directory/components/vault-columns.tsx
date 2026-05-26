'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowDown } from 'lucide-react';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import { formatCurrency } from '@/lib/utils';
import type { VaultData } from '@/vault-directory/fetch-vaults';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface SortableHeaderProps {
  column: string;
  label: string;
  currentSort: string;
  align?: 'left' | 'right';
}

function SortableHeader({
  column,
  label,
  currentSort,
  align = 'left',
}: SortableHeaderProps) {
  const searchParams = useSearchParams();
  const isActive = currentSort === column;
  const Icon = isActive ? ArrowDown : ArrowUpDown;

  // Build URL preserving other params
  const params = new URLSearchParams(searchParams.toString());
  params.set('sort', column);
  params.delete('page'); // Reset to page 1 on sort change

  return (
    <Link
      href={`?${params.toString()}`}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        align === 'right' ? 'justify-end w-full' : ''
      }`}
    >
      {label}
      <Icon
        className={`h-4 w-4 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
      />
    </Link>
  );
}

function formatCompactAsset(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 1) return amount.toFixed(2);
  return amount.toPrecision(4);
}

export function createColumns(currentSort: string): ColumnDef<VaultData>[] {
  return [
    {
      accessorKey: 'name',
      header: () => 'Vault',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ChainIcon chainId={row.original.chainId} className="w-5 h-5" />
          <TokenIcon
            chainId={row.original.chainId}
            address={row.original.underlyingAssetAddress}
            className="w-5 h-5"
          />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'tvlUsd',
      header: () => (
        <SortableHeader
          column="tvl"
          label="TVL"
          currentSort={currentSort}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {formatCurrency(row.original.tvlUsd)}
        </div>
      ),
    },
    {
      id: 'tvlAsset',
      header: () => <div className="text-right">TVL (Asset)</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {formatCompactAsset(row.original.tvlAsset)}
          <span className="text-muted-foreground ml-1">
            {row.original.underlyingAsset}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'depositorCount',
      header: () => (
        <SortableHeader
          column="depositors"
          label="Depositors"
          currentSort={currentSort}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.depositorCount.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: 'netFlow7d',
      header: () => <div className="text-right">Net Flow (7d)</div>,
      cell: ({ row }) => {
        const flow = row.original.netFlow7d;
        const isPositive = flow >= 0;
        return (
          <div
            className={`text-right ${isPositive ? 'text-green-600' : 'text-destructive'}`}
          >
            {isPositive ? '+' : '-'}
            {formatCurrency(Math.abs(flow))}
          </div>
        );
      },
    },
    {
      accessorKey: 'creationDate',
      header: () => (
        <SortableHeader
          column="age"
          label="Created"
          currentSort={currentSort}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(row.original.creationDate)}
        </div>
      ),
    },
  ];
}
