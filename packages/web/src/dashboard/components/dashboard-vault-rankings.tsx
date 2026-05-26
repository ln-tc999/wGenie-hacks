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
import { getChainName } from '@/lib/vaults-registry';
import type { VaultRanking } from '@/dashboard/fetch-dashboard-rankings';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

function VaultRankingTable({
  title,
  icon,
  vaults,
}: {
  title: string;
  icon: React.ReactNode;
  vaults: VaultRanking[];
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
              <TableHead className="text-right">Chain</TableHead>
              <TableHead className="text-right pr-6">7d Deposits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaults.map((vault, i) => (
              <TableRow key={`${vault.chainId}:${vault.vaultAddress}`}>
                <TableCell className="pl-6 text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/vaults/${vault.chainId}/${vault.vaultAddress}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {vault.vaultName}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {getChainName(vault.chainId)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono">
                  {formatCurrency(vault.deposit7dUsd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function DashboardVaultRankings({
  topVaults,
  bottomVaults,
}: {
  topVaults: VaultRanking[];
  bottomVaults: VaultRanking[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <VaultRankingTable
        title="Top 10 Vaults (7d Deposits)"
        icon={<TrendingUpIcon className="h-4 w-4 text-green-600" />}
        vaults={topVaults}
      />
      <VaultRankingTable
        title="Bottom 10 Vaults (7d Deposits)"
        icon={<TrendingDownIcon className="h-4 w-4 text-red-600" />}
        vaults={bottomVaults}
      />
    </div>
  );
}
