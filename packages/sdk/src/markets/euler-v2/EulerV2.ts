import {
  Address,
  Hex,
  erc20Abi,
  erc4626Abi,
  encodeFunctionData,
} from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { FuseAction } from '../../fusion.types';
import { eulerV2SupplyFuseAbi } from './abi/euler-v2-supply-fuse.abi';
import { eulerV2BorrowingAbi } from './abi/euler-v2-borrowing.abi';
import { EULER_V2_SUPPLY_FUSE_ADDRESS } from './euler-v2.addresses';
import { MARKET_ID } from '../market-id';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import { to18 } from '../../utils/to18';
import { ONE_ETHER } from '../../utils/constants';
import { extractEulerSubstrate } from './utils/extract-euler-substrate';
import { generateSubAccountAddress } from './utils/generate-sub-account-address';
import type { MarketSubstrateBalance } from '../market-balance.types';

interface EulerV2Options {
  supplyFuse?: Address;
}

export class EulerV2 {
  private readonly supplyFuseAddress: Address;

  constructor(
    private readonly plasmaVault: PlasmaVault,
    options?: EulerV2Options,
  ) {
    const supplyFuse =
      options?.supplyFuse ??
      EULER_V2_SUPPLY_FUSE_ADDRESS[plasmaVault.chainId];

    if (!supplyFuse) {
      throw new Error(
        `EulerV2 supply fuse not available on chain ${plasmaVault.chainId}`,
      );
    }

    this.supplyFuseAddress = supplyFuse;
  }

  supply(
    eulerVault: Address,
    maxAmount: bigint,
    subAccount: Hex = '0x00',
  ): FuseAction[] {
    const data = encodeFunctionData({
      abi: eulerV2SupplyFuseAbi,
      functionName: 'enter',
      args: [{ eulerVault, maxAmount, subAccount }],
    });
    return [{ fuse: this.supplyFuseAddress, data }];
  }

  withdraw(
    eulerVault: Address,
    maxAmount: bigint,
    subAccount: Hex = '0x00',
  ): FuseAction[] {
    const data = encodeFunctionData({
      abi: eulerV2SupplyFuseAbi,
      functionName: 'exit',
      args: [{ eulerVault, maxAmount, subAccount }],
    });
    return [{ fuse: this.supplyFuseAddress, data }];
  }

  async getBalances(): Promise<MarketSubstrateBalance[]> {
    const {
      publicClient,
      address: vaultAddress,
      priceOracle,
    } = this.plasmaVault;

    const rawSubstrates = await this.plasmaVault.getMarketSubstrates(
      MARKET_ID.EULER_V2,
    );
    if (rawSubstrates.length === 0) return [];

    const substrates = rawSubstrates.map((s) => extractEulerSubstrate(s));
    const subAccountAddresses = substrates.map((s) =>
      generateSubAccountAddress(vaultAddress, s.subAccount),
    );

    // Get underlying assets from ERC4626 vaults
    const underlyingResults = await publicClient.multicall({
      contracts: substrates.map((s) => ({
        address: s.eulerVault,
        abi: erc4626Abi,
        functionName: 'asset' as const,
      })),
      allowFailure: true,
    });

    const underlyingAssets = underlyingResults.map((r) =>
      r.status === 'success'
        ? (r.result as Address)
        : ('0x0000000000000000000000000000000000000000' as Address),
    );

    // Get share balances + decimals + prices + symbols
    const [shareResults, decimalsResults, priceResults, symbolResults] =
      await Promise.all([
        publicClient.multicall({
          contracts: substrates.map((s, i) => ({
            address: s.eulerVault,
            abi: erc4626Abi,
            functionName: 'balanceOf' as const,
            args: [subAccountAddresses[i]],
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: underlyingAssets.map((addr) => ({
            address: addr,
            abi: erc20Abi,
            functionName: 'decimals' as const,
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: underlyingAssets.map((addr) => ({
            address: priceOracle,
            abi: priceOracleMiddlewareAbi,
            functionName: 'getAssetPrice' as const,
            args: [addr],
          })),
          allowFailure: true,
        }),
        publicClient.multicall({
          contracts: underlyingAssets.map((addr) => ({
            address: addr,
            abi: erc20Abi,
            functionName: 'symbol' as const,
          })),
          allowFailure: true,
        }),
      ]);

    // Convert shares to underlying assets + get debt
    const convertAndDebtContracts = substrates.flatMap((s, i) => {
      const shares =
        shareResults[i]?.status === 'success'
          ? (shareResults[i].result as bigint)
          : 0n;
      return [
        {
          address: s.eulerVault,
          abi: erc4626Abi,
          functionName: 'convertToAssets' as const,
          args: [shares],
        },
        {
          address: s.eulerVault,
          abi: eulerV2BorrowingAbi,
          functionName: 'debtOf' as const,
          args: [subAccountAddresses[i]],
        },
      ];
    });

    const convertAndDebtResults = await publicClient.multicall({
      contracts: convertAndDebtContracts,
      allowFailure: true,
    });

    return substrates.map((substrate, i) => {
      const decimals =
        decimalsResults[i]?.status === 'success'
          ? Number(decimalsResults[i].result)
          : 18;
      const symbol =
        symbolResults[i]?.status === 'success'
          ? (symbolResults[i].result as string)
          : '???';

      const supplyBalance =
        convertAndDebtResults[i * 2]?.status === 'success'
          ? (convertAndDebtResults[i * 2].result as bigint)
          : 0n;
      const borrowBalance =
        convertAndDebtResults[i * 2 + 1]?.status === 'success'
          ? (convertAndDebtResults[i * 2 + 1].result as bigint)
          : 0n;
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
        substrate: rawSubstrates[i],
        marketId: 'EULER_V2' as const,
        underlyingTokenAddress: underlyingAssets[i],
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
