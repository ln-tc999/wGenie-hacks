'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import Link from 'next/link';
import type { ActivityItem } from '../fetch-activity';
import { RelativeDate } from './relative-date';
import { Account } from '@/account/account';
import { getExplorerTxUrl } from '@/lib/get-explorer-tx-url';
import type { ChainId } from '@/app/wagmi-provider';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toFixed(2);
}

export function createActivityColumns(): ColumnDef<ActivityItem>[] {
  return [
    {
      id: 'type',
      header: () => 'Activity',
      cell: ({ row }) => {
        const isDeposit = row.original.type === 'deposit';
        return (
          <Badge
            variant={isDeposit ? 'default' : 'secondary'}
            className={
              isDeposit
                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }
          >
            {isDeposit ? 'Deposit' : 'Withdrawal'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'vaultName',
      header: () => 'Vault',
      cell: ({ row }) => {
        const { chainId, vaultAddress, vaultName, assetAddress } = row.original;
        return (
          <div className="flex items-center gap-2">
            <ChainIcon chainId={chainId} className="w-5 h-5" />
            <TokenIcon
              chainId={chainId}
              address={assetAddress}
              className="w-5 h-5"
            />
            <Link
              href={`/vaults/${chainId}/${vaultAddress}`}
              className="text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors font-medium"
            >
              {vaultName}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {formatCurrency(row.original.amount)}
          <span className="text-muted-foreground ml-1">
            {row.original.assetSymbol}
          </span>
        </div>
      ),
    },
    {
      id: 'depositor',
      header: () => 'Depositor',
      cell: ({ row }) => (
        <Account
          address={row.original.depositorAddress}
          chainId={row.original.chainId as ChainId}
        />
      ),
    },
    {
      id: 'txHash',
      header: () => 'Transaction',
      cell: ({ row }) => {
        const { transactionHash, chainId } = row.original;
        return (
          <a
            href={getExplorerTxUrl(transactionHash as `0x${string}`, chainId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
          >
            View Tx
          </a>
        );
      },
    },
    {
      accessorKey: 'timestamp',
      header: () => <div className="text-right">Date</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <RelativeDate timestamp={row.original.timestamp} />
        </div>
      ),
    },
  ];
}
