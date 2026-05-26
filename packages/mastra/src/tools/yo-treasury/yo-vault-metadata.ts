import {
  YO_USDC_ADDRESS,
  YO_WETH_ADDRESS,
  YO_CBBTC_ADDRESS,
  YO_EURC_ADDRESS,
} from '@wgenie/fusion-sdk';

/** Static token metadata for YO vault underlying assets */
export const YO_UNDERLYING: Record<string, { decimals: number; symbol: string }> = {
  yoUSD: { decimals: 6, symbol: 'USDC' },
  yoETH: { decimals: 18, symbol: 'WETH' },
  yoBTC: { decimals: 8, symbol: 'cbBTC' },
  yoEUR: { decimals: 6, symbol: 'EURC' },
  yoGOLD: { decimals: 6, symbol: 'XAUt' },
  yoUSDT: { decimals: 6, symbol: 'USDT' },
};

/** Get all YO vault underlying token addresses for a chain (for simulation balance snapshots) */
export function getYoUnderlyingAddresses(chainId: number): string[] {
  const id = chainId as keyof typeof YO_USDC_ADDRESS;
  const addrs = [
    YO_USDC_ADDRESS[id],
    YO_WETH_ADDRESS[id],
    YO_CBBTC_ADDRESS[id],
    YO_EURC_ADDRESS[id],
  ];
  return addrs.filter((a): a is NonNullable<typeof a> => a !== undefined);
}
