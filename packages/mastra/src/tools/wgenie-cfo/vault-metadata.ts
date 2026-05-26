import {
  USDYC_ADDRESS,
  YO_WETH_ADDRESS,
  YO_CBBTC_ADDRESS,
  MNTC_ADDRESS,
} from '@wgenie/fusion-sdk';

/** Static token metadata for Mantle vault underlying assets */
export const YO_UNDERLYING: Record<string, { decimals: number; symbol: string }> = {
  USDY: { decimals: 6, symbol: 'USDC' },
  mETH: { decimals: 18, symbol: 'WETH' },
  cmBTC: { decimals: 8, symbol: 'cbBTC' },
  MNT: { decimals: 6, symbol: 'EURC' },
  yoGOLD: { decimals: 6, symbol: 'XAUt' },
  USDYT: { decimals: 6, symbol: 'USDT' },
};

/** Get all Mantle vault underlying token addresses for a chain (for simulation balance snapshots) */
export function getYoUnderlyingAddresses(chainId: number): string[] {
  const id = chainId as keyof typeof USDYC_ADDRESS;
  const addrs = [
    USDYC_ADDRESS[id],
    YO_WETH_ADDRESS[id],
    YO_CBBTC_ADDRESS[id],
    MNTC_ADDRESS[id],
  ];
  return addrs.filter((a): a is NonNullable<typeof a> => a !== undefined);
}
