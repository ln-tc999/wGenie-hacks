import { type Address, type PublicClient, erc20Abi, formatUnits } from 'viem';
import {
  PlasmaVault,
  MARKET_ID,
  substrateToAddress,
  AaveV3,
  Morpho,
  EulerV2,
  type MarketSubstrateBalance,
} from '@wgenie/fusion-sdk';
import type { MarketAllocation } from './types';

// Import JSON directly so esbuild bundles them (readFileSync + import.meta.url
// doesn't work in Mastra's bundled output directory)
import ethVaultData from './euler-vault-labels/ETHEREUM_MAINNET_1_VAULT_DATA.json';
import arbVaultData from './euler-vault-labels/ARBITRUM_MAINNET_42161_VAULT_DATA.json';
import baseVaultData from './euler-vault-labels/BASE_MAINNET_8453_VAULT_DATA.json';

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

/** Minimal ERC4626 ABI for reading vault positions */
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

/** Minimal ABI for Morpho.idToMarketParams(bytes32) */
const idToMarketParamsAbi = [
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'idToMarketParams',
    outputs: [
      { name: 'loanToken', type: 'address' },
      { name: 'collateralToken', type: 'address' },
      { name: 'oracle', type: 'address' },
      { name: 'irm', type: 'address' },
      { name: 'lltv', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/** Morpho contract addresses per chain */
const MORPHO_ADDRESS: Record<number, Address> = {
  1: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  42161: '0x6c247b1F6182318877311737BaC0844bAa518F5e',
  8453: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
};

/** Euler vault label JSONs keyed by chainId → { address: { name } } */
type EulerVaultData = Record<string, { name: string; description?: string; entity?: string | string[] }>;

const eulerVaultDataByChain: Record<number, EulerVaultData> = {
  1: ethVaultData as EulerVaultData,
  42161: arbVaultData as EulerVaultData,
  8453: baseVaultData as EulerVaultData,
};

function getEulerVaultLabels(chainId: number): EulerVaultData {
  return eulerVaultDataByChain[chainId] ?? {};
}

/** Reverse-lookup market ID bigint to its constant name */
function getMarketName(marketId: bigint): string {
  for (const [name, id] of Object.entries(MARKET_ID)) {
    if (id === marketId) return name;
  }
  return `MARKET_${marketId}`;
}

/** Human-readable protocol name from market ID name */
function formatProtocolName(marketId: string): string {
  const names: Record<string, string> = {
    AAVE_V3: 'Aave V3',
    AAVE_V3_LIDO: 'Aave V3 Lido',
    MORPHO: 'Morpho',
    EULER_V2: 'Euler V2',
    COMPOUND_V3_USDC: 'Compound V3',
    COMPOUND_V3_USDT: 'Compound V3',
    COMPOUND_V3_WETH: 'Compound V3',
    SPARK: 'Spark',
    MOONWELL: 'Moonwell',
  };
  if (names[marketId]) return names[marketId];
  return marketId;
}

/** Balance snapshot for a vault — ERC20 tokens + market positions */
export interface BalanceSnapshot {
  assets: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
    priceUsd: string;
    valueUsd: string;
  }>;
  markets: MarketAllocation[];
  totalValueUsd: string;
}

/**
 * Read vault balances using the fusion SDK.
 * Extracted from getMarketBalancesTool so both the balances tool
 * and the simulation tool can reuse the same logic.
 *
 * @param publicClient - Any viem PublicClient (can point to live chain or Anvil fork)
 * @param vaultAddress - PlasmaVault contract address
 */
export async function readVaultBalances(
  publicClient: PublicClient,
  vaultAddress: Address,
  additionalTokenAddresses?: Address[],
): Promise<BalanceSnapshot> {
  const plasmaVault = await PlasmaVault.create(
    publicClient,
    vaultAddress,
  );

  let totalValueUsdFloat = 0;

  // ─── ERC20 unallocated tokens ───

  const substrates = await plasmaVault.getMarketSubstrates(
    MARKET_ID.ERC20_VAULT_BALANCE,
  );

  let assets: BalanceSnapshot['assets'] = [];

  {
    const tokenAddresses = substrates
      .map((s) => substrateToAddress(s))
      .filter((addr): addr is Address => addr !== undefined);

    // Merge additional token addresses (e.g. YO vault underlyings)
    if (additionalTokenAddresses) {
      const addrSet = new Set(tokenAddresses.map(a => a.toLowerCase()));
      for (const addr of additionalTokenAddresses) {
        if (!addrSet.has(addr.toLowerCase())) {
          tokenAddresses.push(addr);
          addrSet.add(addr.toLowerCase());
        }
      }
    }

    if (tokenAddresses.length > 0) {
      const metadataResults = await publicClient.multicall({
        contracts: tokenAddresses.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: 'name' as const },
          {
            address: addr,
            abi: erc20Abi,
            functionName: 'symbol' as const,
          },
          {
            address: addr,
            abi: erc20Abi,
            functionName: 'decimals' as const,
          },
          {
            address: addr,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [plasmaVault.address],
          },
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

        const name =
          nameResult.status === 'success'
            ? (nameResult.result as string)
            : addr;
        const symbol =
          symbolResult.status === 'success'
            ? (symbolResult.result as string)
            : '???';
        const decimals =
          decimalsResult.status === 'success'
            ? Number(decimalsResult.result)
            : 18;
        const balance =
          balanceResult.status === 'success'
            ? (balanceResult.result as bigint)
            : 0n;

        const balanceFormatted = formatUnits(balance, decimals);

        let priceUsd = '0.00';
        let valueUsd = '0.00';

        if (priceResult.status === 'success') {
          const [rawPrice, rawPriceDecimals] = priceResult.result as [
            bigint,
            bigint,
          ];
          const pDecimals = Number(rawPriceDecimals);
          const priceFloat = Number(rawPrice) / 10 ** pDecimals;
          priceUsd = priceFloat.toFixed(2);

          if (balance > 0n && rawPrice > 0n) {
            const valueFloat =
              Number(balance * rawPrice) / 10 ** (decimals + pDecimals);
            valueUsd = valueFloat.toFixed(2);
            totalValueUsdFloat += valueFloat;
          }
        }

        return {
          address: addr,
          name,
          symbol,
          decimals,
          balance: balance.toString(),
          balanceFormatted,
          priceUsd,
          valueUsd,
        };
      });
    }
  }

  // ─── Market allocations ───

  const markets: MarketAllocation[] = [];

  let activeMarketIds: bigint[] = [];
  try {
    const allMarketIds = await plasmaVault.getMarketIds({
      include: ['balanceFuses'],
    });
    activeMarketIds = allMarketIds.filter(
      (id) => id !== MARKET_ID.ERC20_VAULT_BALANCE,
    );
  } catch {
    // If getMarketIds fails, skip market balance reading
  }

  const marketIdSet = new Set<string>();
  for (const id of activeMarketIds) {
    marketIdSet.add(getMarketName(id));
  }

  // Accumulator for ERC4626 positions — grouped into one MarketAllocation
  const erc4626Positions: import('./types').MarketPosition[] = [];
  let erc4626TotalUsd = 0;

  for (const marketName of marketIdSet) {
    try {
      if (marketName.startsWith('ERC4626_')) {
        // Find the numeric market ID for this name
        const marketId = activeMarketIds.find(id => getMarketName(id) === marketName);
        if (!marketId) continue;

        const erc4626Substrates = await plasmaVault.getMarketSubstrates(marketId);
        const vaultAddrs = erc4626Substrates
          .map(s => substrateToAddress(s))
          .filter((a): a is Address => a !== undefined);

        // Pass 1: shares, symbol, underlying asset for each ERC4626 vault
        const pass1 = await publicClient.multicall({
          contracts: vaultAddrs.flatMap((addr) => [
            { address: addr, abi: erc20Abi, functionName: 'balanceOf' as const, args: [plasmaVault.address] },
            { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
            { address: addr, abi: erc4626Abi, functionName: 'asset' as const },
          ]),
          allowFailure: true,
        });

        for (let i = 0; i < vaultAddrs.length; i++) {
          const shares = pass1[i * 3 + 0].status === 'success' ? (pass1[i * 3 + 0].result as bigint) : 0n;
          if (shares === 0n) continue;

          const vaultSymbol = pass1[i * 3 + 1].status === 'success' ? (pass1[i * 3 + 1].result as string) : '???';
          const underlyingAddr = pass1[i * 3 + 2].status === 'success' ? (pass1[i * 3 + 2].result as Address) : undefined;
          if (!underlyingAddr) continue;

          // Pass 2: convertToAssets, underlying metadata, price
          const pass2 = await publicClient.multicall({
            contracts: [
              { address: vaultAddrs[i], abi: erc4626Abi, functionName: 'convertToAssets' as const, args: [shares] },
              { address: underlyingAddr, abi: erc20Abi, functionName: 'symbol' as const },
              { address: underlyingAddr, abi: erc20Abi, functionName: 'decimals' as const },
              { address: plasmaVault.priceOracle, abi: getAssetPriceAbi, functionName: 'getAssetPrice' as const, args: [underlyingAddr] },
            ],
            allowFailure: true,
          });

          const underlyingAmount = pass2[0].status === 'success' ? (pass2[0].result as bigint) : shares;
          const underlyingSym = pass2[1].status === 'success' ? (pass2[1].result as string) : '???';
          const underlyingDec = pass2[2].status === 'success' ? Number(pass2[2].result) : 18;

          let posValueUsd = 0;
          if (pass2[3].status === 'success') {
            const [rawPrice, rawPriceDecimals] = pass2[3].result as [bigint, bigint];
            const pDecimals = Number(rawPriceDecimals);
            if (underlyingAmount > 0n && rawPrice > 0n) {
              posValueUsd = Number(underlyingAmount * rawPrice) / 10 ** (underlyingDec + pDecimals);
            }
          }

          erc4626TotalUsd += posValueUsd;
          erc4626Positions.push({
            substrate: vaultAddrs[i],
            underlyingToken: underlyingAddr,
            underlyingSymbol: underlyingSym,
            label: vaultSymbol,
            supplyFormatted: formatUnits(underlyingAmount, underlyingDec),
            supplyValueUsd: posValueUsd.toFixed(2),
            borrowFormatted: '0',
            borrowValueUsd: '0.00',
            totalValueUsd: posValueUsd.toFixed(2),
          });
        }
        continue;
      }

      let balances: MarketSubstrateBalance[] = [];

      if (
        marketName === 'AAVE_V3' ||
        marketName === 'AAVE_V3_LIDO'
      ) {
        const aaveV3 = new AaveV3(plasmaVault);
        balances = await aaveV3.getBalances();
      } else if (marketName === 'MORPHO') {
        const morpho = new Morpho(plasmaVault);
        balances = await morpho.getBalances();
      } else if (marketName === 'EULER_V2') {
        const eulerV2 = new EulerV2(plasmaVault);
        balances = await eulerV2.getBalances();
      } else {
        continue;
      }

      // Resolve labels for Morpho markets (collateral/loan token pairs)
      let morphoLabels: Map<string, string> | undefined;
      if (marketName === 'MORPHO' && balances.length > 0) {
        morphoLabels = await resolveMorphoLabels(
          publicClient,
          plasmaVault.chainId,
          balances.map((b) => b.substrate as `0x${string}`),
        );
      }

      // Resolve labels for Euler V2 markets (static JSON + on-chain fallback)
      let eulerLabels: Map<string, string> | undefined;
      if (marketName === 'EULER_V2' && balances.length > 0) {
        eulerLabels = await resolveEulerLabels(
          publicClient,
          plasmaVault.chainId,
          balances.map((b) => b.substrate),
        );
      }

      let marketTotalUsd = 0;
      const positions = balances.map((b) => {
        const totalFloat = Number(b.totalBalanceUsd_18) / 1e18;
        marketTotalUsd += totalFloat;
        // Euler V2 substrates are bytes32(bytes20(vaultAddress)) — extract the
        // 20-byte vault address so the agent can pass it directly to the tool.
        const substrate =
          marketName === 'EULER_V2'
            ? eulerSubstrateToAddress(b.substrate)
            : b.substrate;
        return {
          substrate,
          underlyingToken: b.underlyingTokenAddress,
          underlyingSymbol: b.underlyingTokenSymbol,
          label: morphoLabels?.get(b.substrate) ?? eulerLabels?.get(b.substrate),
          supplyFormatted: formatUnits(
            b.supplyBalance,
            b.underlyingTokenDecimals,
          ),
          supplyValueUsd: (
            Number(b.supplyBalanceUsd_18) / 1e18
          ).toFixed(2),
          borrowFormatted: formatUnits(
            b.borrowBalance,
            b.underlyingTokenDecimals,
          ),
          borrowValueUsd: (
            Number(b.borrowBalanceUsd_18) / 1e18
          ).toFixed(2),
          totalValueUsd: totalFloat.toFixed(2),
        };
      });

      markets.push({
        marketId: marketName,
        protocol: formatProtocolName(marketName),
        positions,
        totalValueUsd: marketTotalUsd.toFixed(2),
      });

      totalValueUsdFloat += marketTotalUsd;
    } catch {
      // Skip failed market reads
    }
  }

  // Push grouped ERC4626 allocation if any positions found
  if (erc4626Positions.length > 0) {
    markets.push({
      marketId: 'ERC4626',
      protocol: 'ERC4626',
      positions: erc4626Positions,
      totalValueUsd: erc4626TotalUsd.toFixed(2),
    });
    totalValueUsdFloat += erc4626TotalUsd;
  }

  return {
    assets,
    markets,
    totalValueUsd: totalValueUsdFloat.toFixed(2),
  };
}

/**
 * Resolve Morpho market labels by fetching collateral/loan token symbols.
 * Returns a map from substrate (morphoMarketId) to "collateralSymbol / loanSymbol".
 */
async function resolveMorphoLabels(
  publicClient: PublicClient,
  chainId: number,
  substrates: `0x${string}`[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const morphoAddress = MORPHO_ADDRESS[chainId];
  if (!morphoAddress || substrates.length === 0) return labels;

  try {
    // Step 1: Get market params (collateral + loan token addresses)
    const paramsResults = await publicClient.multicall({
      contracts: substrates.map((substrate) => ({
        address: morphoAddress,
        abi: idToMarketParamsAbi,
        functionName: 'idToMarketParams' as const,
        args: [substrate],
      })),
      allowFailure: true,
    });

    // Collect unique token addresses to resolve symbols
    const tokenSet = new Set<Address>();
    const marketTokens: Array<{ loan: Address; collateral: Address } | null> = [];

    for (const r of paramsResults) {
      if (r.status === 'success') {
        const result = r.result as readonly [Address, Address, Address, Address, bigint];
        const loan = result[0];
        const collateral = result[1];
        tokenSet.add(loan);
        tokenSet.add(collateral);
        marketTokens.push({ loan, collateral });
      } else {
        marketTokens.push(null);
      }
    }

    // Step 2: Resolve symbols for all unique tokens
    const uniqueTokens = Array.from(tokenSet);
    if (uniqueTokens.length === 0) return labels;

    const symbolResults = await publicClient.multicall({
      contracts: uniqueTokens.map((addr) => ({
        address: addr,
        abi: erc20Abi,
        functionName: 'symbol' as const,
      })),
      allowFailure: true,
    });

    const symbolMap = new Map<string, string>();
    uniqueTokens.forEach((addr, i) => {
      const r = symbolResults[i];
      if (r.status === 'success') {
        symbolMap.set(addr.toLowerCase(), r.result as string);
      }
    });

    // Step 3: Build labels
    substrates.forEach((substrate, i) => {
      const tokens = marketTokens[i];
      if (!tokens) return;
      const loanSymbol = symbolMap.get(tokens.loan.toLowerCase()) ?? '???';
      const collateralSymbol = symbolMap.get(tokens.collateral.toLowerCase()) ?? '???';
      labels.set(substrate, `${collateralSymbol} / ${loanSymbol}`);
    });
  } catch {
    // Label resolution is best-effort
  }

  return labels;
}

/**
 * Extract the Euler vault address from a substrate.
 * Euler V2 substrates store the vault address in the first 20 bytes
 * (bytes32(bytes20(vaultAddress))).
 */
function eulerSubstrateToAddress(substrate: string): Address {
  return ('0x' + substrate.slice(2, 42)) as Address;
}

/**
 * Resolve Euler V2 vault labels from static JSON data with on-chain fallback.
 * First checks the bundled JSON for known vault names, then fetches the ERC4626
 * vault name() on-chain for any unknown vaults.
 */
async function resolveEulerLabels(
  publicClient: PublicClient,
  chainId: number,
  substrates: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const vaultData = getEulerVaultLabels(chainId);
  const missingSubstrates: string[] = [];

  for (const substrate of substrates) {
    const vaultAddress = eulerSubstrateToAddress(substrate);
    // JSON keys may be checksummed — do case-insensitive lookup
    const entry = Object.entries(vaultData).find(
      ([addr]) => addr.toLowerCase() === vaultAddress.toLowerCase(),
    );
    if (entry) {
      labels.set(substrate, entry[1].name);
    } else {
      missingSubstrates.push(substrate);
    }
  }

  // Fetch vault names on-chain for any substrates not in the static JSON
  if (missingSubstrates.length > 0) {
    try {
      const nameResults = await publicClient.multicall({
        contracts: missingSubstrates.map((substrate) => ({
          address: eulerSubstrateToAddress(substrate),
          abi: erc20Abi,
          functionName: 'name' as const,
        })),
        allowFailure: true,
      });

      missingSubstrates.forEach((substrate, i) => {
        const r = nameResults[i];
        if (r.status === 'success' && r.result) {
          labels.set(substrate, r.result as string);
        }
      });
    } catch {
      // On-chain fallback is best-effort
    }
  }

  return labels;
}
