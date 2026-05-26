import { Address, Hex, erc20Abi, encodeFunctionData } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { FuseAction } from '../../fusion.types';
import { morphoSupplyFuseAbi } from './abi/morpho-supply-fuse.abi';
import { morphoBorrowFuseAbi } from './abi/morpho-borrow-fuse.abi';
import { morphoAbi } from './abi/morpho.abi';
import {
  MORPHO_SUPPLY_FUSE_ADDRESS,
  MORPHO_BORROW_FUSE_ADDRESS,
} from './morpho-fuse.addresses';
import { MORPHO_ADDRESS } from './morpho.addresses';
import { MARKET_ID } from '../market-id';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import { to18 } from '../../utils/to18';
import { ONE_ETHER } from '../../utils/constants';
import type { MarketSubstrateBalance } from '../market-balance.types';

interface MorphoOptions {
  supplyFuse?: Address;
  borrowFuse?: Address;
}

export class Morpho {
  private readonly supplyFuseAddress: Address;
  private readonly borrowFuseAddress: Address | undefined;

  constructor(
    private readonly plasmaVault: PlasmaVault,
    options?: MorphoOptions,
  ) {
    const supplyFuse =
      options?.supplyFuse ??
      MORPHO_SUPPLY_FUSE_ADDRESS[plasmaVault.chainId];

    if (!supplyFuse) {
      throw new Error(
        `Morpho supply fuse not available on chain ${plasmaVault.chainId}`,
      );
    }

    this.supplyFuseAddress = supplyFuse;
    this.borrowFuseAddress =
      options?.borrowFuse ??
      MORPHO_BORROW_FUSE_ADDRESS[plasmaVault.chainId];
  }

  supply(morphoMarketId: Hex, amount: bigint): FuseAction[] {
    const data = encodeFunctionData({
      abi: morphoSupplyFuseAbi,
      functionName: 'enter',
      args: [{ morphoMarketId, amount }],
    });
    return [{ fuse: this.supplyFuseAddress, data }];
  }

  withdraw(morphoMarketId: Hex, amount: bigint): FuseAction[] {
    const data = encodeFunctionData({
      abi: morphoSupplyFuseAbi,
      functionName: 'exit',
      args: [{ morphoMarketId, amount }],
    });
    return [{ fuse: this.supplyFuseAddress, data }];
  }

  borrow(morphoMarketId: Hex, amountToBorrow: bigint): FuseAction[] {
    if (!this.borrowFuseAddress) {
      throw new Error(
        `Morpho borrow fuse not available on chain ${this.plasmaVault.chainId}`,
      );
    }
    const data = encodeFunctionData({
      abi: morphoBorrowFuseAbi,
      functionName: 'enter',
      args: [{ morphoMarketId, amountToBorrow, sharesToBorrow: 0n }],
    });
    return [{ fuse: this.borrowFuseAddress, data }];
  }

  repay(morphoMarketId: Hex, amountToRepay: bigint): FuseAction[] {
    if (!this.borrowFuseAddress) {
      throw new Error(
        `Morpho borrow fuse not available on chain ${this.plasmaVault.chainId}`,
      );
    }
    const data = encodeFunctionData({
      abi: morphoBorrowFuseAbi,
      functionName: 'exit',
      args: [{ morphoMarketId, amountToRepay, sharesToRepay: 0n }],
    });
    return [{ fuse: this.borrowFuseAddress, data }];
  }

  async getBalances(): Promise<MarketSubstrateBalance[]> {
    const {
      publicClient,
      address: vaultAddress,
      chainId,
      priceOracle,
    } = this.plasmaVault;

    const morphoAddress = MORPHO_ADDRESS[chainId];
    if (!morphoAddress) return [];

    const morphoMarketIds = await this.plasmaVault.getMarketSubstrates(
      MARKET_ID.MORPHO,
    );
    if (morphoMarketIds.length === 0) return [];

    // Get positions + market data + market params in parallel
    const [positionResults, marketDataResults, marketParamsResults] =
      await Promise.all([
        publicClient.multicall({
          contracts: morphoMarketIds.map((marketId) => ({
            address: morphoAddress,
            abi: morphoAbi,
            functionName: 'position' as const,
            args: [marketId, vaultAddress],
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: morphoMarketIds.map((marketId) => ({
            address: morphoAddress,
            abi: morphoAbi,
            functionName: 'market' as const,
            args: [marketId],
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: morphoMarketIds.map((marketId) => ({
            address: morphoAddress,
            abi: morphoAbi,
            functionName: 'idToMarketParams' as const,
            args: [marketId],
          })),
          allowFailure: true,
        }),
      ]);

    // Extract loan token addresses
    const loanTokenAddresses = marketParamsResults.map((r) => {
      if (r.status === 'success') {
        const result = r.result as readonly [
          Address,
          Address,
          Address,
          Address,
          bigint,
        ];
        return result[0]; // loanToken
      }
      return '0x0000000000000000000000000000000000000000' as Address;
    });

    // Get decimals + prices + symbols
    const [decimalsResults, priceResults, symbolResults] = await Promise.all([
      publicClient.multicall({
        contracts: loanTokenAddresses.map((addr) => ({
          address: addr,
          abi: erc20Abi,
          functionName: 'decimals' as const,
        })),
        allowFailure: true,
      }),
      publicClient.multicall({
        contracts: loanTokenAddresses.map((addr) => ({
          address: priceOracle,
          abi: priceOracleMiddlewareAbi,
          functionName: 'getAssetPrice' as const,
          args: [addr],
        })),
        allowFailure: true,
      }),
      publicClient.multicall({
        contracts: loanTokenAddresses.map((addr) => ({
          address: addr,
          abi: erc20Abi,
          functionName: 'symbol' as const,
        })),
        allowFailure: true,
      }),
    ]);

    return morphoMarketIds.map((morphoMarketId, i) => {
      const positionResult = positionResults[i];
      const marketDataResult = marketDataResults[i];
      const decimals =
        decimalsResults[i]?.status === 'success'
          ? Number(decimalsResults[i].result)
          : 18;
      const symbol =
        symbolResults[i]?.status === 'success'
          ? (symbolResults[i].result as string)
          : '???';

      let supplyBalance = 0n;
      let borrowBalance = 0n;

      if (
        positionResult.status === 'success' &&
        marketDataResult.status === 'success'
      ) {
        const posResult = positionResult.result as readonly [
          bigint,
          bigint,
          bigint,
        ];
        const supplyShares = posResult[0];
        const borrowShares = posResult[1];

        const mktResult = marketDataResult.result as readonly [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ];
        const totalSupplyAssets = mktResult[0];
        const totalSupplyShares = mktResult[1];
        const totalBorrowAssets = mktResult[2];
        const totalBorrowShares = mktResult[3];

        // Convert shares to assets using exchange ratios
        if (totalSupplyShares > 0n) {
          supplyBalance =
            (supplyShares * totalSupplyAssets) / totalSupplyShares;
        }
        if (totalBorrowShares > 0n) {
          borrowBalance =
            (borrowShares * totalBorrowAssets) / totalBorrowShares;
        }
      }

      const totalBalance = supplyBalance - borrowBalance;

      let supplyBalanceUsd_18 = 0n;
      let borrowBalanceUsd_18 = 0n;
      let totalBalanceUsd_18 = 0n;

      if (priceResults[i]?.status === 'success') {
        const [rawPrice, rawPriceDecimals] = priceResults[i].result as [
          bigint,
          bigint,
        ];
        const price_18 = to18(rawPrice, Number(rawPriceDecimals));
        supplyBalanceUsd_18 =
          (to18(supplyBalance, decimals) * price_18) / ONE_ETHER;
        borrowBalanceUsd_18 =
          (to18(borrowBalance, decimals) * price_18) / ONE_ETHER;
        totalBalanceUsd_18 = supplyBalanceUsd_18 - borrowBalanceUsd_18;
      }

      return {
        substrate: morphoMarketId,
        marketId: 'MORPHO' as const,
        underlyingTokenAddress: loanTokenAddresses[i],
        underlyingTokenSymbol: symbol,
        underlyingTokenDecimals: decimals,
        supplyBalance,
        borrowBalance,
        totalBalance,
        supplyBalanceUsd_18,
        borrowBalanceUsd_18,
        totalBalanceUsd_18,
      };
    });
  }
}
