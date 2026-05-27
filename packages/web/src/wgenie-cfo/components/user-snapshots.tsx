'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';

interface Props {
  vaultAddress: Address;
}

export function YoUserSnapshots({ vaultAddress }: Props) {
  const { address } = useAccount();

  if (!address) return null;

  return null;
}
