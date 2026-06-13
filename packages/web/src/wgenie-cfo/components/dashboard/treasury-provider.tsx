'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createPublicClient, http, formatEther, type Address } from 'viem';
import { mantleSepoliaTestnet, mantle } from 'viem/chains';
import { TREASURY } from './mock-data';

export type PositionData = {
  protocol: string;
  asset: string;
  amountLabel: string;
  valueLabel: string;
  apyLabel: string;
  changePct: number;
  color: string;
};

export type TreasuryData = {
  mntBalance: string;
  mntBalanceFormatted: string;
  loading: boolean;
  error: string | null;
  totalValueUsd: number;
  positions: PositionData[];
  refetch: () => void;
};

const defaultData: TreasuryData = {
  mntBalance: '0', mntBalanceFormatted: '0', loading: true, error: null,
  totalValueUsd: 0, positions: [], refetch: () => {},
};

const TreasuryContext = createContext<TreasuryData>(defaultData);

export function useTreasury() {
  return useContext(TreasuryContext);
}

const RPC: Record<number, string | undefined> = {
  5000: process.env.NEXT_PUBLIC_RPC_URL_MANTLE,
  5003: process.env.NEXT_PUBLIC_RPC_URL_MANTLE_SEPOLIA,
};

const chains: Record<number, any> = { 5000: mantle, 5003: mantleSepoliaTestnet };

function pc(chainId: number) {
  const ch = chains[chainId];
  const rpc = RPC[chainId];
  if (!ch || !rpc) return null;
  return createPublicClient({ chain: ch, transport: http(rpc) });
}

const tAbi = [
  { type: 'function', name: 'balances', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
] as const;

export function TreasuryProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<Omit<TreasuryData, 'refetch'>>({
    mntBalance: '0', mntBalanceFormatted: '0', loading: true, error: null, totalValueUsd: 0, positions: [],
  });

  const fetchData = useCallback(async () => {
    const c = pc(TREASURY.chainId);
    if (!c) { setRaw(prev => ({ ...prev, loading: false, error: 'Unsupported chain' })); return; }
    try {
      const vaultAddress = TREASURY.address as Address;
      const [mntBal] = await Promise.all([
        c.getBalance({ address: vaultAddress }),
        c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'owner' }).catch(() => '0x0'),
      ]);
      const mntFormatted = formatEther(mntBal);
      const mntValue = Number(mntFormatted) * 0.62;
      const positions = mntBal > 0n
        ? [{ protocol: 'Idle', asset: 'MNT', amountLabel: Number(mntFormatted).toFixed(2), valueLabel: `$${mntValue.toFixed(2)}`, apyLabel: '—', changePct: 0, color: '#3B5BDB' }]
        : [];
      setRaw({ mntBalance: mntBal.toString(), mntBalanceFormatted: mntFormatted, loading: false, error: null, totalValueUsd: mntValue, positions });
    } catch (e: any) {
      setRaw(prev => ({ ...prev, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const value = useMemo<TreasuryData>(() => ({ ...raw, refetch: fetchData }), [raw, fetchData]);

  return <TreasuryContext.Provider value={value}>{children}</TreasuryContext.Provider>;
}
