import { TableCell, TableRow } from '@/components/ui/table';
import { useDepositorsListItemContext } from '../depositors-list-item.context';
import { formatBalance } from '@/lib/format-balance';
import { fromUnixTime } from 'date-fns';
import { formatDate } from '@/lib/date';
import { Account } from '@/account/account';

export const DepositorsListItemContent = () => {
  const {
    params: {
      address,
      chainId,
      shareDecimals,
      shareBalance,
      assetBalance,
      assetDecimals,
      assetSymbol,
      onchainShareBalance,
      firstActivity,
      lastActivity,
    },
  } = useDepositorsListItemContext();

  const formattedShareBalance = formatBalance({
    balance: shareBalance,
    decimals: shareDecimals ?? 18,
  });
  const formattedAssetBalance = assetBalance
    ? formatBalance({
        balance: assetBalance,
        decimals: assetDecimals ?? 18,
      })
    : '—';
  const formattedOnchainShareBalance = onchainShareBalance
    ? formatBalance({
        balance: onchainShareBalance,
        decimals: shareDecimals ?? 18,
      })
    : '—';
  const formattedFirstActivity = formatDate(fromUnixTime(firstActivity));
  const formattedLastActivity = formatDate(fromUnixTime(lastActivity));

  return (
    <TableRow key={address}>
      <TableCell>
        <Account address={address} chainId={chainId} />
      </TableCell>
      <TableCell className="text-right font-mono">
        {formattedAssetBalance}
        {assetSymbol && (
          <span className="text-muted-foreground ml-2">{assetSymbol}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formattedShareBalance}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formattedOnchainShareBalance}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {formattedFirstActivity}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {formattedLastActivity}
      </TableCell>
    </TableRow>
  );
};
