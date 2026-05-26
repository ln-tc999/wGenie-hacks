'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChainIcon } from '@/components/chain-icon';
import { TokenIcon } from '@/components/token-icon';
import type { ActivityMetadata, ActivitySearchParams } from '../fetch-activity';

interface Props {
  metadata: ActivityMetadata;
  searchParams: ActivitySearchParams;
}

export function ActivityFilterBar({ metadata, searchParams }: Props) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [depositorInput, setDepositorInput] = useState(searchParams.depositor || '');

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(urlSearchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleChainChange = (value: string) => {
    updateFilters({ chains: value === 'all' ? null : value });
  };

  const handleTypeChange = (value: string) => {
    updateFilters({ type: value === 'all' ? null : value });
  };

  const handleVaultChange = (value: string) => {
    updateFilters({ vaults: value === 'all' ? null : value });
  };

  const handleMinAmountChange = (value: string) => {
    updateFilters({ min_amount: value === 'all' ? null : value });
  };

  const handleDepositorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ depositor: depositorInput.trim() || null });
  };

  const currentChain = searchParams.chains || 'all';
  const currentType = searchParams.type || 'all';
  const currentVault = searchParams.vaults || 'all';
  const currentMinAmount = searchParams.min_amount || 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Network Filter */}
      <Select
        value={currentChain}
        onValueChange={handleChainChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Networks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Networks</SelectItem>
          {metadata.chains.map((chain) => (
            <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
              {chain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Activity Type Filter */}
      <Select
        value={currentType}
        onValueChange={handleTypeChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Activity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Activity</SelectItem>
          <SelectItem value="deposit">Deposits</SelectItem>
          <SelectItem value="withdraw">Withdrawals</SelectItem>
        </SelectContent>
      </Select>

      {/* Vault Filter */}
      <Select
        value={currentVault}
        onValueChange={handleVaultChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="All Vaults" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Vaults</SelectItem>
          {metadata.vaults.map((vault) => (
            <SelectItem key={vault.address} value={vault.address.toLowerCase()}>
              <div className="flex items-center gap-2">
                <ChainIcon chainId={vault.chainId} className="w-4 h-4" />
                <TokenIcon chainId={vault.chainId} address={vault.assetAddress} className="w-4 h-4" />
                <span>{vault.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Min Amount Filter (Toggle Group) */}
      <ToggleGroup
        type="single"
        variant="outline"
        value={currentMinAmount}
        onValueChange={(value) => handleMinAmountChange(value || 'all')}
        disabled={isPending}
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="100">&gt;$100</ToggleGroupItem>
        <ToggleGroupItem value="1000">&gt;$1K</ToggleGroupItem>
        <ToggleGroupItem value="10000">&gt;$10K</ToggleGroupItem>
      </ToggleGroup>

      {/* Depositor Address Input */}
      <form onSubmit={handleDepositorSubmit} className="flex-1 min-w-[200px] max-w-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Paste Wallet Address"
            value={depositorInput}
            onChange={(e) => setDepositorInput(e.target.value)}
            className="pl-9"
            disabled={isPending}
          />
        </div>
      </form>
    </div>
  );
}
