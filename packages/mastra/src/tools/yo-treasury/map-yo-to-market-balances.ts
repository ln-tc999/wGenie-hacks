import type { MarketAllocation } from '../alpha/types';
import type { YoPosition } from './read-yo-treasury-balances';

/** Map YoPosition[] to a single grouped MarketAllocation */
export function mapYoPositionsToMarkets(yoPositions: YoPosition[]): MarketAllocation[] {
  if (yoPositions.length === 0) return [];

  return [{
    marketId: 'ERC4626',
    protocol: 'ERC4626',
    positions: yoPositions.map(pos => ({
      substrate: pos.vaultAddress,
      underlyingToken: pos.underlyingAddress,
      underlyingSymbol: pos.underlyingSymbol,
      label: pos.vaultSymbol,
      supplyFormatted: pos.underlyingFormatted,
      supplyValueUsd: pos.valueUsd,
      borrowFormatted: '0',
      borrowValueUsd: '0.00',
      totalValueUsd: pos.valueUsd,
    })),
    totalValueUsd: yoPositions.reduce(
      (sum, p) => sum + parseFloat(p.valueUsd), 0
    ).toFixed(2),
  }];
}
