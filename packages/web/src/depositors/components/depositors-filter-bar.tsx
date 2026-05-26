'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DepositorSearchParams } from '../fetch-depositors';

interface Props {
  searchParams: DepositorSearchParams;
}

export function DepositorsFilterBar({ searchParams }: Props) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [depositorInput, setDepositorInput] = useState(
    searchParams.depositor || '',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(urlSearchParams.toString());
    const value = depositorInput.trim();

    if (value) {
      params.set('depositor', value);
    } else {
      params.delete('depositor');
    }
    params.delete('page');

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-[200px] max-w-[300px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by address"
          value={depositorInput}
          onChange={(e) => setDepositorInput(e.target.value)}
          className="pl-9"
          disabled={isPending}
        />
      </div>
    </form>
  );
}
