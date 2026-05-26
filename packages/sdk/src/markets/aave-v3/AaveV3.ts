import { Address, erc20Abi, encodeFunctionData } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { FuseAction } from '../../fusion.types';
import { aaveV3SupplyFuseAbi } from './abi/aave-v3-supply-fuse.abi';
import { aaveV3BorrowFuseAbi } from './abi/aave-v3-borrow-fuse.abi';
import {
  aaveV3PoolAddressesProviderAbi,
  aaveV3PoolDataProviderAbi,
} from './abi/aave-v3-pool.abi';
import {
  AAVE_V3_SUPPLY_FUSE_ADDRESS,
  AAVE_V3_BORROW_FUSE_ADDRESS,
  AAVE_V3_POOL_ADDRESSES_PROVIDER,
} from './aave-v3.addresses';
import { MARKET_ID } from '../market-id';
import { substrateToAddress } from '../../substrates/utils/substrate-to-address';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import { to18 } from '../../utils/to18';
import { ONE_ETHER } from '../../utils/constants';
import type { MarketSubstrateBalance } from '../market-balance.types';

interface AaveV3Options {
  supplyFuse?: Address;
  borrowFuse?: Address;
}

export class AaveV3 {
  private readonly supplyFuseAddress: Address;
  private readonly borrowFuseAddress: Address | undefined;

  constructor(
    private readonly plasmaVault: PlasmaVault,
    options?: AaveV3Options,
  ) {
    const supplyFuse =
      options?.supplyFuse ??
      AAVE_V3_SUPPLY_FUSE_ADDRESS[plasmaVault.chainId];

    if (!supplyFuse) {
      throw new Error(
        `AaveV3 supply fuse not available on chain ${plasmaVault.chainId}`,
      );
    }

    this.supplyFuseAddress = supplyFuse;
    this.borrowFuseAddress =
      options?.borrowFuse ??
      AAVE_V3_BORROW_FUSE_ADDRESS[plasmaVault.chainId];
  }

  supply(assetAddress: Address, amount: bigint): FuseAction[] {
    const data = encodeFunctionData({
      abi: aaveV3SupplyFuseAbi,
      functionName: 'enter',
      args: [{ asset: assetAddress, amount, userEModeCategoryId: 0n }],
    });
    return [{ fuse: this.supplyFuseAddress, data }];
  }

  withdraw(assetAddress: Address, amount: bigint): FuseAction[] {
    const data = encodeFunctionData({
      abi: aaveV3SupplyFuseAbi,
      functionName: 'exit',
      args: [{ asset: assetAddress, amount }],
    });
    return [{ fuse: this.supplyFuseAddress, data }];
  }

  borrow(assetAddress: Address, amount: bigint): FuseAction[] {
    if (!this.borrowFuseAddress) {
      throw new Error(
        `AaveV3 borrow fuse not available on chain ${this.plasmaVault.chainId}`,
      );
    }
    const data = encodeFunctionData({
      abi: aaveV3BorrowFuseAbi,
      functionName: 'enter',
      args: [{ asset: assetAddress, amount }],
    });
    return [{ fuse: this.borrowFuseAddress, data }];
  }

  repay(assetAddress: Address, amount: bigint): FuseAction[] {
    if (!this.borrowFuseAddress) {
      throw new Error(
        `AaveV3 borrow fuse not available on chain ${this.plasmaVault.chainId}`,
      );
    }
    const data = encodeFunctionData({
      abi: aaveV3BorrowFuseAbi,
      functionName: 'exit',
      args: [{ asset: assetAddress, amount }],
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

    const substrates = await this.plasmaVault.getMarketSubstrates(
      MARKET_ID.AAVE_V3,
    );
    if (substrates.length === 0) return [];

    const assetAddresses = substrates
      .map((s) => substrateToAddress(s))
      .filter((a): a is Address => a !== undefined);
    if (assetAddresses.length === 0) return [];

    const providerAddress = AAVE_V3_POOL_ADDRESSES_PROVIDER[chainId];
    if (!providerAddress) return [];

    const poolDataProvider = await publicClient.readContract({
      address: providerAddress,
      abi: aaveV3PoolAddressesProviderAbi,
      functionName: 'getPoolDataProvider',
    });

    const [reserveTokensResults, decimalsResults, priceResults, symbolResults] =
      await Promise.all([
        publicClient.multicall({
          contracts: assetAddresses.map((asset) => ({
            address: poolDataProvider,
            abi: aaveV3PoolDataProviderAbi,
            functionName: 'getReserveTokensAddresses' as const,
            args: [asset],
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: assetAddresses.map((addr) => ({
            address: addr,
            abi: erc20Abi,
            functionName: 'decimals' as const,
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: assetAddresses.map((addr) => ({
            address: priceOracle,
            abi: priceOracleMiddlewareAbi,
            functionName: 'getAssetPrice' as const,
            args: [addr],
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: assetAddresses.map((addr) => ({
            address: addr,
            abi: erc20Abi,
            functionName: 'symbol' as const,
          })),
          allowFailure: true,
        }),
      ]);

    // Build balance calls only for successful reserve token lookups
    const balanceContracts = assetAddresses.flatMap((_addr, i) => {
      const reserveResult = reserveTokensResults[i];
      if (reserveResult.status !== 'success') return [];
      const [aToken, stableDebt, variableDebt] = reserveResult.result;
      return [
        {
          address: aToken,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [vaultAddress],
        },
        {
          address: stableDebt,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [vaultAddress],
        },
        {
          address: variableDebt,
          abi: erc20Abi,
          functionName: 'balanceOf' as const,
          args: [vaultAddress],
        },
      ];
    });

    const balanceResults = await publicClient.multicall({
      contracts: balanceContracts,
      allowFailure: true,
    });

    let balanceIdx = 0;
    return assetAddresses.map((asset, i) => {
      const reserveResult = reserveTokensResults[i];
      const decimals =
        decimalsResults[i].status === 'success'
          ? Number(decimalsResults[i].result)
          : 18;
      const symbol =
        symbolResults[i].status === 'success'
          ? (symbolResults[i].result as string)
          : '???';

      let supplyBalance = 0n;
      let borrowBalance = 0n;

      if (reserveResult.status === 'success') {
        const aTokenBal =
          balanceResults[balanceIdx]?.status === 'success'
            ? (balanceResults[balanceIdx].result as bigint)
            : 0n;
        const stableDebtBal =
          balanceResults[balanceIdx + 1]?.status === 'success'
            ? (balanceResults[balanceIdx + 1].result as bigint)
            : 0n;
        const variableDebtBal =
          balanceResults[balanceIdx + 2]?.status === 'success'
            ? (balanceResults[balanceIdx + 2].result as bigint)
            : 0n;
        supplyBalance = aTokenBal;
        borrowBalance = stableDebtBal + variableDebtBal;
        balanceIdx += 3;
      }

      const totalBalance = supplyBalance - borrowBalance;

      let supplyBalanceUsd_18 = 0n;
      let borrowBalanceUsd_18 = 0n;
      let totalBalanceUsd_18 = 0n;

      if (priceResults[i].status === 'success') {
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
        substrate: substrates[i],
        marketId: 'AAVE_V3' as const,
        underlyingTokenAddress: asset,
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
