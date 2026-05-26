'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import { useRouter } from 'next/navigation';
import { getAppConfig } from '@/lib/app-config';

type Status = 'idle' | 'signing' | 'authenticating' | 'error';

export function LoginContent() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const config = getAppConfig();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    setError(null);
    connect({ connector: injected() });
  };

  const handleSignIn = async () => {
    if (!address || !chainId) return;

    try {
      // Step 1: Create SIWE message
      setStatus('signing');
      setError(null);

      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: `Sign in to ${config.name}`,
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: generateSiweNonce(),
      });

      // Step 2: Sign message with wallet
      const signature = await signMessageAsync({ message });

      // Step 3: Authenticate server-side (whitelist + session)
      setStatus('authenticating');

      const res = await fetch('/api/auth/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Sign-in failed. Please try again.');
      }

      // Step 4: Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      setStatus('error');
      if (err instanceof Error && err.message.includes('User rejected')) {
        setError('Signature rejected. Please try again.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
        );
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8">
        <div className="flex flex-col items-center gap-4">
          <img
            src={config.logo}
            alt={config.name}
            className="h-12 w-auto"
          />
          <h1 className="text-xl font-semibold text-foreground">Sign In</h1>
          <p className="text-center text-sm text-muted-foreground">
            Connect your Ethereum wallet to access the dashboard.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Connected as</p>
              <p className="truncate font-mono text-sm text-foreground">
                {address}
              </p>
            </div>

            <button
              onClick={handleSignIn}
              disabled={status === 'signing' || status === 'authenticating'}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === 'signing' && 'Sign the message in your wallet...'}
              {status === 'authenticating' && 'Signing in...'}
              {(status === 'idle' || status === 'error') &&
                'Sign In with Ethereum'}
            </button>

            <button
              onClick={() => {
                disconnect();
                setError(null);
                setStatus('idle');
              }}
              className="w-full rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
