import { Address, Hex } from 'viem';
import { MarketId } from './market-id';

export interface MarketSubstrateBalance {
  substrate: Hex;
  marketId: MarketId;
  underlyingTokenAddress: Address;
  underlyingTokenSymbol: string;
  underlyingTokenDecimals: number;
  supplyBalance: bigint;
  borrowBalance: bigint;
  totalBalance: bigint;
  supplyBalanceUsd_18: bigint;
  borrowBalanceUsd_18: bigint;
  totalBalanceUsd_18: bigint;
}
