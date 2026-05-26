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
import type { TopDepositor } from '@/dashboard/fetch-dashboard-rankings';
import type { Address } from 'viem';
import { UsersIcon } from 'lucide-react';

export function DashboardTopDepositors({
  depositors,
}: {
  depositors: TopDepositor[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <UsersIcon className="h-4 w-4" />
          Top 10 Depositors by Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right pr-6">Vaults</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {depositors.map((depositor, i) => (
              <TableRow key={depositor.address}>
                <TableCell className="pl-6 text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {truncateHex(depositor.address as Address, 6)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(depositor.totalBalanceUsd)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  {depositor.vaultCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
