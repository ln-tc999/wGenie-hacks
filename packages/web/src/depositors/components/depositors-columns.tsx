'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { truncateHex } from '@/lib/truncate-hex';
import { getDebankProfileUrl } from '@/lib/get-debank-profile-url';
import { formatDate } from '@/lib/date';
import { fromUnixTime } from 'date-fns';
import type { DepositorItem } from '@/depositors/fetch-depositors';
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

  const params = new URLSearchParams(searchParams.toString());
  params.set('sort', column);
  params.delete('page');

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

export function createColumns(
  currentSort: string,
): ColumnDef<DepositorItem>[] {
  return [
    {
      accessorKey: 'address',
      header: () => 'Depositor',
      cell: ({ row }) => {
        const address = row.original.address;
        return (
          <a
            href={getDebankProfileUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors font-mono text-sm"
            title={address}
          >
            {truncateHex(address, 6)}
          </a>
        );
      },
    },
    {
      accessorKey: 'totalBalanceUsd',
      header: () => (
        <SortableHeader
          column="balance"
          label="Total Balance"
          currentSort={currentSort}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {formatCurrency(row.original.totalBalanceUsd)}
        </div>
      ),
    },
    {
      accessorKey: 'vaultCount',
      header: () => (
        <SortableHeader
          column="vaults"
          label="Vaults"
          currentSort={currentSort}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right">{row.original.vaultCount}</div>
      ),
    },
    {
      accessorKey: 'lastActivity',
      header: () => (
        <SortableHeader
          column="activity"
          label="Last Activity"
          currentSort={currentSort}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {formatDate(fromUnixTime(row.original.lastActivity))}
        </div>
      ),
    },
  ];
}
