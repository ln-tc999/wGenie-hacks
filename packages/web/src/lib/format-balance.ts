import { formatUnits } from 'viem';

interface Args {
  balance: bigint;
  decimals: number;
}

export const formatBalance = ({ balance, decimals }: Args): string => {
  const formattedBalance = formatUnits(balance, decimals);
  const num = parseFloat(formattedBalance);

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  } else {
    return num.toFixed(4);
  }
};
