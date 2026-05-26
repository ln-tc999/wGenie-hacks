import type { VaultData } from '@/vault-directory/fetch-vaults';
import type { VaultParams } from '@/app/app.types';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ChainId } from '@/app/wagmi-provider';

interface Props {
  vault: VaultData;
  onVaultClick: (vaultParams: VaultParams) => void;
}

export const VaultCard = ({ vault, onVaultClick }: Props) => {
  const formatNetFlow = (
    flow: number,
  ): { value: string; isPositive: boolean } => {
    const isPositive = flow >= 0;
    const absFlow = Math.abs(flow);
    return {
      value: formatCurrency(absFlow),
      isPositive,
    };
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const netFlow = formatNetFlow(vault.netFlow7d);

  const vaultParams: VaultParams = {
    chainId: vault.chainId as ChainId,
    vaultAddress: vault.address,
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onVaultClick(vaultParams)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onVaultClick(vaultParams);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${vault.name} vault`}
    >
      <CardHeader>
        <CardTitle className="text-lg mb-1 truncate">{vault.name}</CardTitle>
        <CardDescription>{vault.protocol}</CardDescription>
        <CardAction>
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">
              {vault.underlyingAsset.charAt(0)}
            </span>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* TVL */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Total Value Locked
            </p>
            <p className="text-lg font-semibold">{formatCurrency(vault.tvlUsd)}</p>
          </div>

          {/* Depositors */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Depositors</p>
            <p className="text-lg font-semibold">
              {vault.depositorCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Net Flow */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Net Flow (7d)</p>
            <p
              className={`text-sm font-medium ${netFlow.isPositive ? 'text-green-600' : 'text-destructive'}`}
            >
              {netFlow.isPositive ? '+' : '-'}
              {netFlow.value}
            </p>
          </div>

          {/* Share Price */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Share Price</p>
            <p className="text-sm font-medium">{vault.sharePrice.toFixed(4)}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{vault.underlyingAsset}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Created {formatDate(vault.creationDate)}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
