'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import type { Address } from 'viem';
import { CheckCircle2, Copy, ExternalLink, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StepRow } from './components/step-row';
import { useVaultAddress } from './use-vault-address';
import { CHAIN_ID } from './vault-creation.constants';
import { CloneVaultStep } from './steps/clone-vault-step';
import { GrantRolesStep } from './steps/grant-roles-step';
import { AddFusesStep } from './steps/add-fuses-step';
import { AddBalanceFusesStep } from './steps/add-balance-fuses-step';
import { ConfigureSubstratesStep } from './steps/configure-substrates-step';
import { UpdateDepsStep } from './steps/update-deps-step';

export default function CreateTreasuryVaultPage() {
  const { address, chain: walletChain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [vaultAddress, setVaultAddress, clearVaultAddress] = useVaultAddress();
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCorrectChain = walletChain?.id === CHAIN_ID;

  const handleVaultCreated = useCallback(
    (vault: Address, _accessManager: Address) => {
      setVaultAddress(vault);
    },
    [setVaultAddress],
  );

  const handleComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const handleStartFresh = useCallback(() => {
    clearVaultAddress();
    setIsComplete(false);
  }, [clearVaultAddress]);

  const handleCopy = useCallback(() => {
    if (vaultAddress) {
      navigator.clipboard.writeText(vaultAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [vaultAddress]);

  const hasVault = !!vaultAddress;

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Create Treasury Vault
        </h1>
        <p className="text-muted-foreground">
          Deploy a new Fusion PlasmaVault on Base configured for YO Treasury
        </p>
      </div>

      {!address && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to create a vault.
          </p>
        </Card>
      )}

      {address && !isCorrectChain && (
        <Card className="p-4 space-y-3">
          <StepRow
            number={0}
            label="Switch to Base"
            status={isSwitching ? 'loading' : 'pending'}
            detail={`Connected to ${walletChain?.name ?? 'unknown chain'}`}
          />
          <Button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            disabled={isSwitching}
            size="sm"
            className="w-full"
          >
            {isSwitching && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Switch to Base
          </Button>
        </Card>
      )}

      {address && isCorrectChain && (
        <>
          <Card className="p-4 space-y-3">
            <CloneVaultStep
              onVaultCreated={handleVaultCreated}
              existingVaultAddress={vaultAddress}
            />

            <GrantRolesStep
              vaultAddress={vaultAddress!}
              ownerAddress={address}
              enabled={hasVault}
            />

            <AddFusesStep vaultAddress={vaultAddress!} enabled={hasVault} />

            <AddBalanceFusesStep
              vaultAddress={vaultAddress!}
              enabled={hasVault}
            />

            <ConfigureSubstratesStep
              vaultAddress={vaultAddress!}
              enabled={hasVault}
            />

            <UpdateDepsStep
              vaultAddress={vaultAddress!}
              enabled={hasVault}
              onComplete={handleComplete}
            />
          </Card>

          {isComplete && vaultAddress && (
            <Card className="p-4 space-y-3 border-green-500/30">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Vault created and fully configured!
                </span>
              </div>

              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-3 py-1.5 rounded flex-1 select-all font-mono">
                  {vaultAddress}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button asChild size="sm">
                  <a href={`/vaults/${CHAIN_ID}/${vaultAddress}`}>
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    View Vault Dashboard
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartFresh}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Create Another
                </Button>
              </div>
            </Card>
          )}

          {vaultAddress && !isComplete && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartFresh}
                className="text-muted-foreground"
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Start Fresh
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
