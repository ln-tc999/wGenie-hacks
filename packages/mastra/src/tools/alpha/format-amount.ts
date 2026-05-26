import { formatUnits } from 'viem';

/** Format a raw token amount to human-readable string */
export function formatTokenAmount(amount: string, decimals: number): string {
  return formatUnits(BigInt(amount), decimals);
}
