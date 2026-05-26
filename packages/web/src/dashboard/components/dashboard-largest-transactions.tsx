import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { truncateHex } from '@/lib/truncate-hex';
import { getExplorerTxUrl } from '@/lib/get-explorer-tx-url';
import type { LargestTransaction } from '@/dashboard/fetch-dashboard-rankings';
import type { Address } from 'viem';
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  ExternalLinkIcon,
} from 'lucide-react';

function TransactionTable({
  title,
  icon,
  transactions,
}: {
  title: string;
  icon: React.ReactNode;
  transactions: LargestTransaction[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Vault</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Depositor</TableHead>
              <TableHead className="text-right pr-6">Tx</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx, i) => (
              <TableRow key={tx.id}>
                <TableCell className="pl-6 text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/vaults/${tx.chainId}/${tx.vaultAddress}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {tx.vaultName}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(tx.amountUsd)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-sm text-muted-foreground">
                    {truncateHex(tx.depositorAddress as Address, 4)}
                  </span>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <a
                    href={getExplorerTxUrl(
                      tx.transactionHash as Address,
                      tx.chainId,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                    title="View on block explorer"
                  >
                    <span className="font-mono text-sm">
                      {truncateHex(tx.transactionHash as Address, 4)}
                    </span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function DashboardLargestTransactions({
  largestDeposits,
  largestWithdrawals,
}: {
  largestDeposits: LargestTransaction[];
  largestWithdrawals: LargestTransaction[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TransactionTable
        title="Largest Deposits (7d)"
        icon={<ArrowDownToLineIcon className="h-4 w-4 text-green-600" />}
        transactions={largestDeposits}
      />
      <TransactionTable
        title="Largest Withdrawals (7d)"
        icon={<ArrowUpFromLineIcon className="h-4 w-4 text-red-600" />}
        transactions={largestWithdrawals}
      />
    </div>
  );
}
