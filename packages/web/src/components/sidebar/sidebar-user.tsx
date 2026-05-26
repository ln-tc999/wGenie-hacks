'use client';

import { LogOut } from 'lucide-react';
import { type Address, getAddress, isAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { useAuth } from '@/auth/use-auth';
import { AppProviders } from '@/app/app-providers';
import { AccountContext } from '@/account/account.context';
import { useAccountParams } from '@/account/account.params';
import { AccountAvatar } from '@/account/components/account-avatar';
import { truncateHex } from '@/lib/truncate-hex';

function SidebarUserContent({
  address,
  onSignOut,
}: {
  address: Address;
  onSignOut: () => void;
}) {
  const params = useAccountParams({ address, chainId: mainnet.id });

  const displayName = params.ensName || truncateHex(address);

  return (
    <AccountContext.Provider value={{ params }}>
      <div className="flex items-center gap-2 px-2 py-2">
        <AccountAvatar className="h-7 w-7 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
          {displayName}
        </span>
        <button
          onClick={onSignOut}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </AccountContext.Provider>
  );
}

export function SidebarUser() {
  const { address, signOut } = useAuth();

  if (!address || !isAddress(address)) return null;

  return (
    <AppProviders>
      <SidebarUserContent address={getAddress(address)} onSignOut={signOut} />
    </AppProviders>
  );
}
