'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, type Address, type Hex } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, CheckCircle2, AlertTriangle, Play, Pause, ExternalLink } from 'lucide-react';

interface GuardrailsSettingsProps {
  chainId: number;
  vaultAddress: Address;
}

const settingsAbi = [
  { type: 'function', name: 'setDailyLimit', inputs: [{ name: '_dailyLimit', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setMaxPerTx', inputs: [{ name: '_maxPerTx', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setWhitelistTarget', inputs: [{ name: 'target', type: 'address' }, { name: 'allowed', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'togglePause', inputs: [], outputs: [], stateMutability: 'nonpayable' },
] as const;

export function GuardrailsSettings({ chainId, vaultAddress }: GuardrailsSettingsProps) {
  const { address: userAddress } = useAccount();

  // On-chain state from API
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [dailyLimit, setDailyLimit] = useState('');
  const [maxPerTx, setMaxPerTx] = useState('');
  const [moeWhitelisted, setMoeWhitelisted] = useState(true);
  const [aaveWhitelisted, setAaveWhitelisted] = useState(true);

  // Slippage states (Stored in localStorage)
  const [moeSlippage, setMoeSlippage] = useState('0.5');
  const [aaveSlippage, setAaveSlippage] = useState('0.1');

  // Wagmi Write Contract Hook
  const { writeContract, data: txHash, isPending: isWriting, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Load configuration from API
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/relayer/guardrails?chainId=${chainId}&address=${vaultAddress}`);
      const result = await res.json();
      if (result.success) {
        setConfig(result.data);
        setDailyLimit(result.data.dailyLimitFormatted);
        setMaxPerTx(result.data.maxPerTxFormatted);
        setMoeWhitelisted(result.data.whitelist.merchantMoe);
        setAaveWhitelisted(result.data.whitelist.aaveV3);
      } else {
        setError(result.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  }, [chainId, vaultAddress]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Load slippage from LocalStorage
  useEffect(() => {
    const sMoe = localStorage.getItem(`wgenie_slippage_moe_${vaultAddress}`);
    const sAave = localStorage.getItem(`wgenie_slippage_aave_${vaultAddress}`);
    if (sMoe) setMoeSlippage(sMoe);
    if (sAave) setAaveSlippage(sAave);
  }, [vaultAddress]);

  // Refresh config after on-chain transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      fetchConfig();
    }
  }, [isConfirmed, fetchConfig]);

  const handleUpdateLimits = () => {
    if (!dailyLimit || !maxPerTx) return;
    try {
      writeContract({
        address: vaultAddress,
        abi: settingsAbi,
        functionName: 'setDailyLimit',
        args: [parseEther(dailyLimit)],
        chainId,
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUpdateMaxPerTx = () => {
    if (!maxPerTx) return;
    try {
      writeContract({
        address: vaultAddress,
        abi: settingsAbi,
        functionName: 'setMaxPerTx',
        args: [parseEther(maxPerTx)],
        chainId,
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleToggleMoeWhitelist = () => {
    const MERCHANT_MOE_ROUTER = '0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a';
    writeContract({
      address: vaultAddress,
      abi: settingsAbi,
      functionName: 'setWhitelistTarget',
      args: [MERCHANT_MOE_ROUTER as Address, !moeWhitelisted],
      chainId,
    });
  };

  const handleToggleAaveWhitelist = () => {
    const AAVE_POOL = '0x458F293454fE0d67EC0655f3672301301DD51422';
    writeContract({
      address: vaultAddress,
      abi: settingsAbi,
      functionName: 'setWhitelistTarget',
      args: [AAVE_POOL as Address, !aaveWhitelisted],
      chainId,
    });
  };

  const handleTogglePause = () => {
    writeContract({
      address: vaultAddress,
      abi: settingsAbi,
      functionName: 'togglePause',
      args: [],
      chainId,
    });
  };

  const handleSaveSlippage = () => {
    localStorage.setItem(`wgenie_slippage_moe_${vaultAddress}`, moeSlippage);
    localStorage.setItem(`wgenie_slippage_aave_${vaultAddress}`, aaveSlippage);
    alert('Slippage settings saved locally.');
  };

  const isOwner = userAddress?.toLowerCase() === config?.owner?.toLowerCase();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-wgenie-muted">Fetching guardrails configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-white">
      {/* Access Control Notice */}
      {!isOwner && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            <p className="font-semibold">View-Only Mode</p>
            <p className="opacity-90">Only the owner ({config?.owner?.slice(0,6)}...{config?.owner?.slice(-4)}) can modify limits on-chain.</p>
          </div>
        </div>
      )}

      {/* Grid Settings Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Limits Configuration */}
        <Card className="bg-wgenie-dark p-4 border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">On-Chain Spending Limits</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-wgenie-muted">Daily Limit (MNT)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  disabled={!isOwner || isWriting}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  className="bg-black/20 border-white/10 text-sm"
                />
                <Button
                  onClick={handleUpdateLimits}
                  disabled={!isOwner || isWriting || !dailyLimit}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                >
                  Update
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-wgenie-muted">Max Per Transaction (MNT)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  disabled={!isOwner || isWriting}
                  value={maxPerTx}
                  onChange={(e) => setMaxPerTx(e.target.value)}
                  className="bg-black/20 border-white/10 text-sm"
                />
                <Button
                  onClick={handleUpdateMaxPerTx}
                  disabled={!isOwner || isWriting || !maxPerTx}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                >
                  Update
                </Button>
              </div>
            </div>

            <div className="rounded-md bg-white/5 p-2 text-xs text-wgenie-muted flex justify-between">
              <span>Used Today:</span>
              <span className="font-semibold text-white">{config?.usedTodayFormatted} MNT</span>
            </div>
          </div>
        </Card>

        {/* Protocol Whitelisting */}
        <Card className="bg-wgenie-dark p-4 border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">DeFi Protocol Whitelist</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/10">
              <div>
                <p className="text-sm font-medium">Merchant Moe DEX</p>
                <p className="text-[10px] text-wgenie-muted">Swap and Liquidity Pools</p>
              </div>
              <Button
                onClick={handleToggleMoeWhitelist}
                disabled={!isOwner || isWriting}
                size="sm"
                variant={moeWhitelisted ? 'default' : 'outline'}
                className="h-8"
              >
                {moeWhitelisted ? 'Whitelisted' : 'Restricted'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/10">
              <div>
                <p className="text-sm font-medium">Aave V3 Lending</p>
                <p className="text-[10px] text-wgenie-muted">Supply and Withdraw Yields</p>
              </div>
              <Button
                onClick={handleToggleAaveWhitelist}
                disabled={!isOwner || isWriting}
                size="sm"
                variant={aaveWhitelisted ? 'default' : 'outline'}
                className="h-8"
              >
                {aaveWhitelisted ? 'Whitelisted' : 'Restricted'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Slippage & Local Configurations */}
        <Card className="bg-wgenie-dark p-4 border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">Slippage & Local Limits</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-wgenie-muted">Merchant Moe Swap %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={moeSlippage}
                  onChange={(e) => setMoeSlippage(e.target.value)}
                  className="bg-black/20 border-white/10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-wgenie-muted">Aave Supply Slip %</label>
                <Input
                  type="number"
                  step="0.1"
                  value={aaveSlippage}
                  onChange={(e) => setAaveSlippage(e.target.value)}
                  className="bg-black/20 border-white/10 text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveSlippage}
              size="sm"
              className="w-full mt-2"
            >
              Save Local Settings
            </Button>
          </div>
        </Card>

        {/* Relayer & System Status */}
        <Card className="bg-wgenie-dark p-4 border border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">System Status</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 text-xs">
              <span className="text-wgenie-muted">Manager Relayer:</span>
              <span className="font-mono text-white">{config?.manager?.slice(0, 8)}...{config?.manager?.slice(-6)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 text-xs">
              <span className="text-wgenie-muted">Owner Wallet:</span>
              <span className="font-mono text-white">{config?.owner?.slice(0, 8)}...{config?.owner?.slice(-6)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-wgenie-muted">Treasury Status:</span>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${config?.paused ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-xs font-semibold">{config?.paused ? 'Paused' : 'Active'}</span>
              </div>
            </div>

            <Button
              onClick={handleTogglePause}
              disabled={!isOwner || isWriting}
              variant={config?.paused ? 'default' : 'destructive'}
              size="sm"
              className="w-full mt-2"
            >
              {config?.paused ? (
                <>
                  <Play className="w-4 h-4 mr-2" /> Resume Treasury
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Pause Treasury
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Transaction Feedback Notification */}
      {isWriting && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Confirming transaction in wallet...</span>
        </div>
      )}

      {isConfirming && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Waiting for on-chain block confirmation...</span>
        </div>
      )}

      {isConfirmed && txHash && (
        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-green-500 text-xs flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Settings Saved Successfully!</span>
          </div>
          <a
            href={`https://explorer.sepolia.mantle.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 opacity-85 hover:underline"
          >
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {writeError && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex flex-col gap-1">
          <span className="font-semibold">Transaction Failed</span>
          <span className="opacity-90">{writeError.message.slice(0, 160)}</span>
          <Button variant="ghost" size="sm" onClick={() => resetWrite()} className="self-start mt-1 h-7 text-red-500 hover:bg-red-500/10">
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
