'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppProviders } from '@/app/app-providers';
import { truncateHex } from '@/lib/truncate-hex';

function ConnectWalletButtonInner() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{truncateHex(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Disconnect wallet"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
    >
      <Wallet className="h-4 w-4 mr-2" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}

export function ConnectWalletButton() {
  return (
    <AppProviders>
      <ConnectWalletButtonInner />
    </AppProviders>
  );
}
