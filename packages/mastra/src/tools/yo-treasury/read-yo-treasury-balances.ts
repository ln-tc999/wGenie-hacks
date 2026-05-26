import { type Address, type PublicClient, erc20Abi, formatUnits } from 'viem';
import {
  PlasmaVault,
  MARKET_ID,
  substrateToAddress,
  YO_USDC_ADDRESS,
  YO_WETH_ADDRESS,
  YO_CBBTC_ADDRESS,
  YO_EURC_ADDRESS,
} from '@wgenie/fusion-sdk';

/** Minimal ERC4626 ABI — only functions used by this module */
const erc4626Abi = [
  {
    type: 'function',
    name: 'asset',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: 'shares', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/** Minimal ABI for price oracle's getAssetPrice */
const getAssetPriceAbi = [
  {
    type: 'function',
    name: 'getAssetPrice',
    inputs: [{ name: 'asset_', type: 'address', internalType: 'address' }],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export interface TreasuryAsset {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  priceUsd: string;
  valueUsd: string;
}

export interface YoPosition {
  vaultAddress: string;
  vaultSymbol: string;
  shares: string;
  underlyingAddress: string;
  underlyingSymbol: string;
  underlyingDecimals: number;
  underlyingAmount: string;
  underlyingFormatted: string;
  valueUsd: string;
}

export interface TreasuryBalanceSnapshot {
  assets: TreasuryAsset[];
  yoPositions: YoPosition[];
  totalValueUsd: string;
}

/** Check if a market ID represents an ERC4626 market (100_001+) */
function isErc4626MarketId(marketId: bigint): boolean {
  return marketId >= 100_001n && marketId <= 100_999n;
}

/** Known ERC4626 market IDs used by YO Treasury vaults */
const KNOWN_ERC4626_MARKET_IDS = [100_001n, 100_002n, 100_003n, 100_004n];

/**
 * Read a PlasmaVault's unallocated ERC20 tokens and ERC4626 (YO) positions.
 *
 * For unallocated tokens: reads the vault's ERC4626 asset() directly, then checks
 * its balance. Does NOT depend on ERC20_VAULT_BALANCE substrates being configured.
 *
 * For YO positions: reads known ERC4626 market substrates (100001-100004) directly,
 * falling back from getMarketIds which may return empty if balance fuses aren't
 * queryable through that method.
 */
export async function readYoTreasuryBalances(
  publicClient: PublicClient,
  vaultAddress: Address,
): Promise<TreasuryBalanceSnapshot> {
  const plasmaVault = await PlasmaVault.create(publicClient, vaultAddress);
  let totalValueUsdFloat = 0;

  // ─── ERC20 unallocated tokens ───
  // Read the vault's underlying asset directly via ERC4626 asset()

  let assets: TreasuryAsset[] = [];

  try {
    const underlyingAddress = await publicClient.readContract({
      address: vaultAddress,
      abi: erc4626Abi,
      functionName: 'asset',
    }) as Address;

    // Include all YO vault underlying tokens + ERC20_VAULT_BALANCE substrates
    const chainId = plasmaVault.chainId;
    const yoUnderlyings = [
      YO_USDC_ADDRESS[chainId],
      YO_WETH_ADDRESS[chainId],
      YO_CBBTC_ADDRESS[chainId],
      YO_EURC_ADDRESS[chainId],
    ].filter((a): a is Address => a !== undefined);

    let tokenAddresses: Address[] = [underlyingAddress];
    const addrSet = new Set(tokenAddresses.map(a => a.toLowerCase()));

    // Add all YO vault underlyings
    for (const addr of yoUnderlyings) {
      if (!addrSet.has(addr.toLowerCase())) {
        tokenAddresses.push(addr);
        addrSet.add(addr.toLowerCase());
      }
    }

    // Also try ERC20_VAULT_BALANCE substrates for any extra tokens
    try {
      const substrates = await plasmaVault.getMarketSubstrates(MARKET_ID.ERC20_VAULT_BALANCE);
      const substrateAddrs = substrates
        .map((s) => substrateToAddress(s))
        .filter((addr): addr is Address => addr !== undefined);
      for (const addr of substrateAddrs) {
        if (!addrSet.has(addr.toLowerCase())) {
          tokenAddresses.push(addr);
          addrSet.add(addr.toLowerCase());
        }
      }
    } catch {
      // ERC20_VAULT_BALANCE substrates not configured — fine, we have YO underlyings
    }

    const metadataResults = await publicClient.multicall({
      contracts: tokenAddresses.flatMap((addr) => [
        { address: addr, abi: erc20Abi, functionName: 'name' as const },
        { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
        { address: addr, abi: erc20Abi, functionName: 'decimals' as const },
        { address: addr, abi: erc20Abi, functionName: 'balanceOf' as const, args: [vaultAddress] },
      ]),
      allowFailure: true,
    });

    const priceResults = await publicClient.multicall({
      contracts: tokenAddresses.map((addr) => ({
        address: plasmaVault.priceOracle,
        abi: getAssetPriceAbi,
        functionName: 'getAssetPrice' as const,
        args: [addr],
      })),
      allowFailure: true,
    });

    assets = tokenAddresses.map((addr, i) => {
      const nameResult = metadataResults[i * 4 + 0];
      const symbolResult = metadataResults[i * 4 + 1];
      const decimalsResult = metadataResults[i * 4 + 2];
      const balanceResult = metadataResults[i * 4 + 3];
      const priceResult = priceResults[i];

      const name = nameResult.status === 'success' ? (nameResult.result as string) : addr;
      const symbol = symbolResult.status === 'success' ? (symbolResult.result as string) : '???';
      const decimals = decimalsResult.status === 'success' ? Number(decimalsResult.result) : 18;
      const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : 0n;
      const balanceFormatted = formatUnits(balance, decimals);

      let priceUsd = '0.00';
      let valueUsd = '0.00';

      if (priceResult.status === 'success') {
        const [rawPrice, rawPriceDecimals] = priceResult.result as [bigint, bigint];
        const pDecimals = Number(rawPriceDecimals);
        const priceFloat = Number(rawPrice) / 10 ** pDecimals;
        priceUsd = priceFloat.toFixed(2);
        if (balance > 0n && rawPrice > 0n) {
          const valueFloat = Number(balance * rawPrice) / 10 ** (decimals + pDecimals);
          valueUsd = valueFloat.toFixed(2);
          totalValueUsdFloat += valueFloat;
        }
      }

      return { address: addr, name, symbol, decimals, balance: balance.toString(), balanceFormatted, priceUsd, valueUsd };
    }).filter(a => BigInt(a.balance) > 0n);
  } catch {
    // If reading underlying fails, fall back to empty
  }

  // ─── ERC4626 (YO vault) positions ───

  const yoPositions: YoPosition[] = [];

  // Try getMarketIds first, fall back to known ERC4626 market IDs
  let activeMarketIds: bigint[] = [];
  try {
    const allMarketIds = await plasmaVault.getMarketIds({ include: ['balanceFuses'] });
    activeMarketIds = allMarketIds.filter(
      (id) => id !== MARKET_ID.ERC20_VAULT_BALANCE && isErc4626MarketId(id),
    );
  } catch {
    // getMarketIds failed
  }
  if (activeMarketIds.length === 0) {
    activeMarketIds = KNOWN_ERC4626_MARKET_IDS;
  }

  for (const marketId of activeMarketIds) {
    try {
      const erc4626Substrates = await plasmaVault.getMarketSubstrates(marketId);
      if (erc4626Substrates.length === 0) continue;

      const vaultAddresses = erc4626Substrates
        .map((s) => substrateToAddress(s))
        .filter((a): a is Address => a !== undefined);
      if (vaultAddresses.length === 0) continue;

      // Multicall: balanceOf, symbol, asset for each ERC4626 vault
      const shareResults = await publicClient.multicall({
        contracts: vaultAddresses.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: 'balanceOf' as const, args: [vaultAddress] },
          { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
          { address: addr, abi: erc4626Abi, functionName: 'asset' as const },
        ]),
        allowFailure: true,
      });

      for (let i = 0; i < vaultAddresses.length; i++) {
        const balResult = shareResults[i * 3 + 0];
        const symResult = shareResults[i * 3 + 1];
        const assetResult = shareResults[i * 3 + 2];

        const shares = balResult.status === 'success' ? (balResult.result as bigint) : 0n;
        if (shares === 0n) continue;

        const vaultSymbol = symResult.status === 'success' ? (symResult.result as string) : '???';
        const underlyingAddr = assetResult.status === 'success' ? (assetResult.result as Address) : undefined;
        if (!underlyingAddr) continue;

        // Get underlying info and convert shares to assets
        const [convertResult, underlyingSymbolResult, underlyingDecimalsResult, priceResult] = await publicClient.multicall({
          contracts: [
            { address: vaultAddresses[i], abi: erc4626Abi, functionName: 'convertToAssets' as const, args: [shares] },
            { address: underlyingAddr, abi: erc20Abi, functionName: 'symbol' as const },
            { address: underlyingAddr, abi: erc20Abi, functionName: 'decimals' as const },
            { address: plasmaVault.priceOracle, abi: getAssetPriceAbi, functionName: 'getAssetPrice' as const, args: [underlyingAddr] },
          ],
          allowFailure: true,
        });

        const underlyingAmount = convertResult.status === 'success' ? (convertResult.result as bigint) : shares;
        const underlyingSym = underlyingSymbolResult.status === 'success' ? (underlyingSymbolResult.result as string) : '???';
        const underlyingDec = underlyingDecimalsResult.status === 'success' ? Number(underlyingDecimalsResult.result) : 18;

        let valueUsd = 0;
        if (priceResult.status === 'success') {
          const [rawPrice, rawPriceDecimals] = priceResult.result as [bigint, bigint];
          const pDecimals = Number(rawPriceDecimals);
          if (underlyingAmount > 0n && rawPrice > 0n) {
            valueUsd = Number(underlyingAmount * rawPrice) / 10 ** (underlyingDec + pDecimals);
          }
        }

        totalValueUsdFloat += valueUsd;
        yoPositions.push({
          vaultAddress: vaultAddresses[i],
          vaultSymbol,
          shares: shares.toString(),
          underlyingAddress: underlyingAddr,
          underlyingSymbol: underlyingSym,
          underlyingDecimals: underlyingDec,
          underlyingAmount: underlyingAmount.toString(),
          underlyingFormatted: formatUnits(underlyingAmount, underlyingDec),
          valueUsd: valueUsd.toFixed(2),
        });
      }
    } catch {
      // Skip failed market reads
    }
  }

  return {
    assets,
    yoPositions,
    totalValueUsd: totalValueUsdFloat.toFixed(2),
  };
}
