import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAccountContext } from '../account.context';
import { getAvatarFallback } from '../account.utils';

interface Props {
  className?: string;
}

export const AccountAvatar = ({ className }: Props) => {
  const { params } = useAccountContext();
  const { address, ensName, ensAvatar, isSafeWallet } = params;

  return (
    <Avatar className={className}>
      {isSafeWallet ? (
        <AvatarImage src="/wallets/safe.svg" alt="Safe Wallet" />
      ) : ensAvatar ? (
        <AvatarImage src={ensAvatar} alt={ensName || address} />
      ) : null}
      <AvatarFallback className="text-xs">
        {getAvatarFallback(ensName, address)}
      </AvatarFallback>
    </Avatar>
  );
};
