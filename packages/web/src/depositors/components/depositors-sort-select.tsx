'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  value: string;
}

const sortOptions = [
  { value: 'balance', label: 'Total Balance' },
  { value: 'vaults', label: 'Vault Count' },
  { value: 'activity', label: 'Last Activity' },
];

export function DepositorsSortSelect({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.delete('page');

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
