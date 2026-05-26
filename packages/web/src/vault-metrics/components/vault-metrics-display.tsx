import {
  TrendingUpIcon,
  UsersIcon,
  CalendarIcon,
  DollarSignIcon,
} from 'lucide-react';
import { useVaultMetricsContext } from '@/vault-metrics/vault-metrics.context';
import { VaultMetricsItem } from '@/vault-metrics/components/vault-metrics-item';
import { useVaultContext } from '@/vault/vault.context';
import { formatSignificant } from '@/lib/format-significant';
import { formatDistanceToNow, fromUnixTime } from 'date-fns';

export const VaultMetricsDisplay = () => {
  const {
    params: { metrics, tvl },
  } = useVaultMetricsContext();
  const { assetDecimals, assetSymbol } = useVaultContext();

  const tvlDisplay =
    tvl && assetDecimals ? formatSignificant(tvl, assetDecimals) : '-';
  const activeDepositors = metrics?.activeDepositors.toLocaleString() || '-';
  const allTimeDepositors = metrics?.allTimeDepositors.toLocaleString() || '-';
  const ageDisplay = metrics?.firstDeposit
    ? formatDistanceToNow(fromUnixTime(metrics.firstDeposit))
    : '-';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <VaultMetricsItem
        title="Total Value Locked"
        value={tvlDisplay}
        description={assetSymbol || '-'}
        icon={<DollarSignIcon className="h-4 w-4" />}
      />
      <VaultMetricsItem
        title="Vault Age"
        value={ageDisplay}
        description="Since first deposit"
        icon={<CalendarIcon className="h-4 w-4" />}
      />
      <VaultMetricsItem
        title="Active Depositors"
        value={activeDepositors}
        description="Depositors with position now"
        icon={<UsersIcon className="h-4 w-4" />}
      />
      <VaultMetricsItem
        title="All-time Depositors"
        value={allTimeDepositors}
        description="Total unique depositors since creation"
        icon={<TrendingUpIcon className="h-4 w-4" />}
      />
    </div>
  );
};
