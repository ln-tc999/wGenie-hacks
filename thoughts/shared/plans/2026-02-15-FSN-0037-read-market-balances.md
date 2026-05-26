# FSN-0037: Read Market Balances — Implementation Plan

## Overview

Extend the Alpha Agent's vault inspection capability from only reading unallocated ERC20 token holdings to also reading per-substrate balances allocated to DeFi markets (Aave V3, Morpho, Euler V2). Rename `getVaultAssetsTool` → `getMarketBalancesTool`. Add `getBalances()` methods to the SDK market classes following the patterns from `wgenie-webapp/src/fusion/markets/`.

## Current State Analysis

- `getVaultAssetsTool` reads `MARKET_ID.ERC20_VAULT_BALANCE` (7n) substrates — shows unallocated ERC20 tokens with names, symbols, balances, USD prices
- SDK market classes (`AaveV3`, `Morpho`, `EulerV2`) only encode FuseActions (supply/withdraw/borrow/repay) — no balance reading
- The web app (`wgenie-webapp`) has full per-protocol balance reading with ~4 rounds of RPC multicalls per protocol, returning `CreditMarketBalancesUsd18` objects with all balance breakdowns in 18 decimals
- The `Morpho.abi.ts` already has `position`, `market`, `idToMarketParams` functions
- The SDK has `to18()` utility and `ONE_ETHER` constant for decimal normalization
- PlasmaVault SDK's `getMarketSubstrates(marketId)` reads substrates for any market

### Key Discoveries:

- Aave V3: Substrates = asset addresses. Need `PoolAddressesProvider` → `PoolDataProvider` → `getReserveTokensAddresses` → aToken/debtToken `balanceOf` (`wgenie-webapp/src/fusion/markets/aaveV3/aave-v3-balances-mapper.ts:25-137`)
- Morpho: Substrates = bytes32 market IDs. Need `position()` (shares) + `market()` (totals) + `idToMarketParams()` (tokens) + exchange ratio math (`wgenie-webapp/src/fusion/markets/morpho/morpho-balances-mapper.ts:27-206`)
- Euler V2: Substrates = packed structs (vault+flags+subAccount). Need struct extraction → ERC4626 shares → `convertToAssets` + `debtOf` (`wgenie-webapp/src/fusion/markets/euler-v2/euler-v2-balances-mapper.ts:22-111`)
- Aave V3 Pool Addresses Provider addresses NOT in SDK yet (only in webapp: `wgenie-webapp/src/fusion/markets/aaveV3/addresses.ts:5-11`)
- Euler V2 borrowing ABI (`debtOf`) and substrate utilities NOT in SDK yet
- SDK already exports `morphoAbi` (has `position`, `market`, `idToMarketParams`)

## Desired End State

The `getMarketBalancesTool` returns both:
1. **Unallocated ERC20 tokens** (existing behavior) — per-token name, symbol, balance, USD price, USD value
2. **Market allocations** (new) — per-protocol, per-substrate supply/borrow balances with USD values

The React component displays a combined view: unallocated tokens section + per-protocol market sections. The agent uses this tool to understand the full vault portfolio before creating actions.

### Verification:
- Run `pnpm dev:web` and `pnpm dev:mastra`
- Test in Mastra Studio at `http://localhost:4111/agents/alpha-agent`
- Test in web app at `http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/ask-ai`
- For the test vault, market positions should be zeros (nothing allocated)
- Test against a vault with actual allocations to verify non-zero values

## What We're NOT Doing

- NOT implementing balance reading for all 20+ markets — only Aave V3, Morpho, Euler V2 (the three the Alpha Agent supports)
- NOT changing the fuse action creation tools (createAaveV3ActionTool, etc.)
- NOT adding collateral/borrow breakdown to the UI in Phase 1 — showing net total per position is sufficient
- NOT reading Aave V3 Lido as a separate market (use same Aave V3 logic)
- NOT implementing APY/yield calculations

## Implementation Approach

Follow the web app patterns from `wgenie-webapp/src/fusion/markets/` but adapted for server-side viem multicall (no wagmi/React Query). Add `getBalances()` to each SDK market class, then call them from the Mastra tool.

---

## Phase 1: SDK — Add Balance Reading Infrastructure

### Overview
Add ABIs, addresses, utilities, and `getBalances()` methods to the three market classes.

### Changes Required:

#### 1. Shared balance return type

**File**: `packages/sdk/src/markets/market-balance.types.ts` (NEW)

```typescript
import { Address, Hex } from 'viem';
import { MarketId } from './market-id';

export interface MarketSubstrateBalance {
  substrate: Hex;
  marketId: MarketId;
  underlyingTokenAddress: Address;
  underlyingTokenSymbol: string;
  underlyingTokenDecimals: number;
  supplyBalance: bigint;      // In underlying token units
  borrowBalance: bigint;      // In underlying token units
  totalBalance: bigint;       // supply - borrow (signed, but returned as bigint)
  supplyBalanceUsd_18: bigint; // 18 decimals
  borrowBalanceUsd_18: bigint; // 18 decimals
  totalBalanceUsd_18: bigint;  // 18 decimals
}
```

Export from `packages/sdk/src/index.ts`.

#### 2. Aave V3 — Pool Data Provider ABI + Addresses

**File**: `packages/sdk/src/markets/aave-v3/abi/aave-v3-pool.abi.ts` (NEW)

Minimal ABIs for:
- `IPoolAddressesProvider.getPoolDataProvider()` → `address`
- `IPoolDataProvider.getReserveTokensAddresses(asset)` → `(aToken, stableDebt, variableDebt)`

```typescript
export const aaveV3PoolAddressesProviderAbi = [
  {
    type: 'function',
    name: 'getPoolDataProvider',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
] as const;

export const aaveV3PoolDataProviderAbi = [
  {
    type: 'function',
    name: 'getReserveTokensAddresses',
    inputs: [{ name: 'asset', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'aTokenAddress', type: 'address', internalType: 'address' },
      { name: 'stableDebtTokenAddress', type: 'address', internalType: 'address' },
      { name: 'variableDebtTokenAddress', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'view',
  },
] as const;
```

**File**: `packages/sdk/src/markets/aave-v3/aave-v3.addresses.ts` (EDIT)

Add `AAVE_V3_POOL_ADDRESSES_PROVIDER` constant (addresses from `wgenie-webapp/src/fusion/markets/aaveV3/addresses.ts:5-11`):

```typescript
export const AAVE_V3_POOL_ADDRESSES_PROVIDER = createChainAddresses({
  [mainnet.id]: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
  [arbitrum.id]: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  [base.id]: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
  [plasma.id]: '0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9',
  [avalanche.id]: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
});
```

#### 3. Aave V3 — `getBalances()` method

**File**: `packages/sdk/src/markets/aave-v3/AaveV3.ts` (EDIT)

Add `getBalances()` method following `wgenie-webapp/src/fusion/markets/aaveV3/aave-v3-balances-mapper.ts`:

```typescript
import { MARKET_ID } from '../market-id';
import { substrateToAddress } from '../../substrates/utils/substrate-to-address';
import { to18 } from '../../utils/to18';
import { ONE_ETHER } from '../../utils/constants';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import { aaveV3PoolAddressesProviderAbi, aaveV3PoolDataProviderAbi } from './abi/aave-v3-pool.abi';
import { AAVE_V3_POOL_ADDRESSES_PROVIDER } from './aave-v3.addresses';
import type { MarketSubstrateBalance } from '../market-balance.types';

async getBalances(): Promise<MarketSubstrateBalance[]> {
  const { publicClient, address: vaultAddress, chainId, priceOracle } = this.plasmaVault;

  // 1. Read substrates
  const substrates = await this.plasmaVault.getMarketSubstrates(MARKET_ID.AAVE_V3);
  if (substrates.length === 0) return [];

  const assetAddresses = substrates
    .map(s => substrateToAddress(s))
    .filter((a): a is Address => a !== undefined);
  if (assetAddresses.length === 0) return [];

  // 2. Get pool data provider
  const providerAddress = AAVE_V3_POOL_ADDRESSES_PROVIDER[chainId];
  if (!providerAddress) return [];

  const poolDataProvider = await publicClient.readContract({
    address: providerAddress,
    abi: aaveV3PoolAddressesProviderAbi,
    functionName: 'getPoolDataProvider',
  });

  // 3. Get reserve token addresses + ERC20 metadata + prices in parallel
  const [reserveTokensResults, decimalsResults, priceResults, symbolResults] = await Promise.all([
    publicClient.multicall({
      contracts: assetAddresses.map(asset => ({
        address: poolDataProvider,
        abi: aaveV3PoolDataProviderAbi,
        functionName: 'getReserveTokensAddresses' as const,
        args: [asset],
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: assetAddresses.map(addr => ({
        address: addr, abi: erc20Abi, functionName: 'decimals' as const,
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: assetAddresses.map(addr => ({
        address: priceOracle,
        abi: priceOracleMiddlewareAbi,
        functionName: 'getAssetPrice' as const,
        args: [addr],
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: assetAddresses.map(addr => ({
        address: addr, abi: erc20Abi, functionName: 'symbol' as const,
      })),
      allowFailure: true,
    }),
  ]);

  // 4. Get balances for each reserve token (aToken + stableDebt + variableDebt)
  const balanceContracts = assetAddresses.flatMap((_, i) => {
    const reserveResult = reserveTokensResults[i];
    if (reserveResult.status !== 'success') return [];
    const [aToken, stableDebt, variableDebt] = reserveResult.result;
    return [
      { address: aToken, abi: erc20Abi, functionName: 'balanceOf' as const, args: [vaultAddress] },
      { address: stableDebt, abi: erc20Abi, functionName: 'balanceOf' as const, args: [vaultAddress] },
      { address: variableDebt, abi: erc20Abi, functionName: 'balanceOf' as const, args: [vaultAddress] },
    ];
  });

  const balanceResults = await publicClient.multicall({
    contracts: balanceContracts,
    allowFailure: true,
  });

  // 5. Assemble per-substrate results
  let balanceIdx = 0;
  return assetAddresses.map((asset, i) => {
    const reserveResult = reserveTokensResults[i];
    const decimals = decimalsResults[i].status === 'success' ? Number(decimalsResults[i].result) : 18;
    const symbol = symbolResults[i].status === 'success' ? (symbolResults[i].result as string) : '???';

    let supplyBalance = 0n;
    let borrowBalance = 0n;

    if (reserveResult.status === 'success') {
      const aTokenBal = balanceResults[balanceIdx]?.status === 'success' ? (balanceResults[balanceIdx].result as bigint) : 0n;
      const stableDebtBal = balanceResults[balanceIdx + 1]?.status === 'success' ? (balanceResults[balanceIdx + 1].result as bigint) : 0n;
      const variableDebtBal = balanceResults[balanceIdx + 2]?.status === 'success' ? (balanceResults[balanceIdx + 2].result as bigint) : 0n;
      supplyBalance = aTokenBal;
      borrowBalance = stableDebtBal + variableDebtBal;
      balanceIdx += 3;
    }

    const totalBalance = supplyBalance - borrowBalance;

    // USD calculations (18 decimals)
    let supplyBalanceUsd_18 = 0n;
    let borrowBalanceUsd_18 = 0n;
    let totalBalanceUsd_18 = 0n;

    if (priceResults[i].status === 'success') {
      const [rawPrice, rawPriceDecimals] = priceResults[i].result as [bigint, bigint];
      const price_18 = to18(rawPrice, Number(rawPriceDecimals));
      supplyBalanceUsd_18 = (to18(supplyBalance, decimals) * price_18) / ONE_ETHER;
      borrowBalanceUsd_18 = (to18(borrowBalance, decimals) * price_18) / ONE_ETHER;
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
```

#### 4. Morpho — `getBalances()` method

**File**: `packages/sdk/src/markets/morpho/Morpho.ts` (EDIT)

Add `getBalances()` following `wgenie-webapp/src/fusion/markets/morpho/morpho-balances-mapper.ts`:

```typescript
import { morphoAbi } from './abi/morpho.abi';
import { MORPHO_ADDRESS } from './morpho.addresses';
import { MARKET_ID } from '../market-id';
import { to18 } from '../../utils/to18';
import { ONE_ETHER } from '../../utils/constants';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import type { MarketSubstrateBalance } from '../market-balance.types';

async getBalances(): Promise<MarketSubstrateBalance[]> {
  const { publicClient, address: vaultAddress, chainId, priceOracle } = this.plasmaVault;

  const morphoAddress = MORPHO_ADDRESS[chainId];
  if (!morphoAddress) return [];

  // 1. Read substrates (Morpho market IDs as bytes32)
  const morphoMarketIds = await this.plasmaVault.getMarketSubstrates(MARKET_ID.MORPHO);
  if (morphoMarketIds.length === 0) return [];

  // 2. Get positions + market data + market params in parallel
  const [positionResults, marketDataResults, marketParamsResults] = await Promise.all([
    publicClient.multicall({
      contracts: morphoMarketIds.map(marketId => ({
        address: morphoAddress,
        abi: morphoAbi,
        functionName: 'position' as const,
        args: [marketId, vaultAddress],
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: morphoMarketIds.map(marketId => ({
        address: morphoAddress,
        abi: morphoAbi,
        functionName: 'market' as const,
        args: [marketId],
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: morphoMarketIds.map(marketId => ({
        address: morphoAddress,
        abi: morphoAbi,
        functionName: 'idToMarketParams' as const,
        args: [marketId],
      })),
      allowFailure: true,
    }),
  ]);

  // 3. Get loan token addresses and fetch decimals + prices
  const loanTokenAddresses = marketParamsResults.map((r, i) => {
    if (r.status === 'success') return (r.result as any)[0] as Address; // loanToken
    return '0x0000000000000000000000000000000000000000' as Address;
  });

  const [decimalsResults, priceResults, symbolResults] = await Promise.all([
    publicClient.multicall({
      contracts: loanTokenAddresses.map(addr => ({
        address: addr, abi: erc20Abi, functionName: 'decimals' as const,
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: loanTokenAddresses.map(addr => ({
        address: priceOracle,
        abi: priceOracleMiddlewareAbi,
        functionName: 'getAssetPrice' as const,
        args: [addr],
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: loanTokenAddresses.map(addr => ({
        address: addr, abi: erc20Abi, functionName: 'symbol' as const,
      })),
      allowFailure: true,
    }),
  ]);

  // 4. Compute balances per substrate
  return morphoMarketIds.map((morphoMarketId, i) => {
    const positionResult = positionResults[i];
    const marketDataResult = marketDataResults[i];
    const decimals = decimalsResults[i]?.status === 'success' ? Number(decimalsResults[i].result) : 18;
    const symbol = symbolResults[i]?.status === 'success' ? (symbolResults[i].result as string) : '???';

    let supplyBalance = 0n;
    let borrowBalance = 0n;

    if (positionResult.status === 'success' && marketDataResult.status === 'success') {
      const [supplyShares, borrowShares] = positionResult.result as [bigint, bigint, bigint];
      const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares] =
        marketDataResult.result as [bigint, bigint, bigint, bigint, bigint, bigint];

      // Convert shares to assets using exchange ratios
      if (totalSupplyShares > 0n) {
        supplyBalance = (supplyShares * totalSupplyAssets) / totalSupplyShares;
      }
      if (totalBorrowShares > 0n) {
        borrowBalance = (borrowShares * totalBorrowAssets) / totalBorrowShares;
      }
    }

    const totalBalance = supplyBalance - borrowBalance;

    // USD calculations
    let supplyBalanceUsd_18 = 0n;
    let borrowBalanceUsd_18 = 0n;
    let totalBalanceUsd_18 = 0n;

    if (priceResults[i]?.status === 'success') {
      const [rawPrice, rawPriceDecimals] = priceResults[i].result as [bigint, bigint];
      const price_18 = to18(rawPrice, Number(rawPriceDecimals));
      supplyBalanceUsd_18 = (to18(supplyBalance, decimals) * price_18) / ONE_ETHER;
      borrowBalanceUsd_18 = (to18(borrowBalance, decimals) * price_18) / ONE_ETHER;
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
```

#### 5. Euler V2 — Utilities + Borrowing ABI

**File**: `packages/sdk/src/markets/euler-v2/abi/euler-v2-borrowing.abi.ts` (NEW)

```typescript
export const eulerV2BorrowingAbi = [
  {
    type: 'function',
    name: 'debtOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
```

**File**: `packages/sdk/src/markets/euler-v2/utils/extract-euler-substrate.ts` (NEW)

Port from `wgenie-webapp/src/fusion/markets/euler-v2/utils/extract-euler-substrate.ts`:

```typescript
import { Address, getAddress, Hex } from 'viem';

export interface EulerSubstrate {
  eulerVault: Address;
  isCollateral: boolean;
  canBorrow: boolean;
  subAccount: number;
}

export const extractEulerSubstrate = (rawSubstrate: Hex): EulerSubstrate => {
  const hexString = rawSubstrate.slice(2);
  const eulerVault = getAddress(`0x${hexString.slice(0, 40)}`);
  const isCollateral = Boolean(parseInt(hexString.slice(40, 42), 16));
  const canBorrow = Boolean(parseInt(hexString.slice(42, 44), 16));
  const subAccount = parseInt(hexString.slice(44, 46), 16);
  return { eulerVault, isCollateral, canBorrow, subAccount };
};
```

**File**: `packages/sdk/src/markets/euler-v2/utils/generate-sub-account-address.ts` (NEW)

Port from `wgenie-webapp/src/fusion/markets/euler-v2/utils/generate-subaccount-address.ts`:

```typescript
import { Address, toHex } from 'viem';

export const generateSubAccountAddress = (primaryAddress: Address, subAccount: number): Address => {
  const primaryBigInt = BigInt(primaryAddress);
  const subAccountBigInt = BigInt(subAccount);
  const result = primaryBigInt ^ subAccountBigInt;
  return toHex(result, { size: 20 }) as Address;
};
```

#### 6. Euler V2 — `getBalances()` method

**File**: `packages/sdk/src/markets/euler-v2/EulerV2.ts` (EDIT)

Add `getBalances()` following `wgenie-webapp/src/fusion/markets/euler-v2/euler-v2-balances-mapper.ts`:

```typescript
import { erc4626Abi, erc20Abi } from 'viem';
import { MARKET_ID } from '../market-id';
import { to18 } from '../../utils/to18';
import { ONE_ETHER } from '../../utils/constants';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import { extractEulerSubstrate } from './utils/extract-euler-substrate';
import { generateSubAccountAddress } from './utils/generate-sub-account-address';
import { eulerV2BorrowingAbi } from './abi/euler-v2-borrowing.abi';
import type { MarketSubstrateBalance } from '../market-balance.types';

async getBalances(): Promise<MarketSubstrateBalance[]> {
  const { publicClient, address: vaultAddress, chainId, priceOracle } = this.plasmaVault;

  // 1. Read substrates and decode
  const rawSubstrates = await this.plasmaVault.getMarketSubstrates(MARKET_ID.EULER_V2);
  if (rawSubstrates.length === 0) return [];

  const substrates = rawSubstrates.map(s => extractEulerSubstrate(s));
  const subAccountAddresses = substrates.map(s => generateSubAccountAddress(vaultAddress, s.subAccount));

  // 2. Get underlying assets from ERC4626 vaults
  const underlyingResults = await publicClient.multicall({
    contracts: substrates.map(s => ({
      address: s.eulerVault,
      abi: erc4626Abi,
      functionName: 'asset' as const,
    })),
    allowFailure: true,
  });

  const underlyingAssets = underlyingResults.map(r =>
    r.status === 'success' ? (r.result as Address) : ('0x0000000000000000000000000000000000000000' as Address)
  );

  // 3. Get share balances + decimals + prices + symbols
  const [shareResults, decimalsResults, priceResults, symbolResults] = await Promise.all([
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
      contracts: underlyingAssets.map(addr => ({
        address: addr, abi: erc20Abi, functionName: 'decimals' as const,
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: underlyingAssets.map(addr => ({
        address: priceOracle,
        abi: priceOracleMiddlewareAbi,
        functionName: 'getAssetPrice' as const,
        args: [addr],
      })),
      allowFailure: true,
    }),
    publicClient.multicall({
      contracts: underlyingAssets.map(addr => ({
        address: addr, abi: erc20Abi, functionName: 'symbol' as const,
      })),
      allowFailure: true,
    }),
  ]);

  // 4. Convert shares to underlying assets + get debt
  const convertAndDebtContracts = substrates.flatMap((s, i) => {
    const shares = shareResults[i]?.status === 'success' ? (shareResults[i].result as bigint) : 0n;
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

  // 5. Assemble results
  return substrates.map((substrate, i) => {
    const decimals = decimalsResults[i]?.status === 'success' ? Number(decimalsResults[i].result) : 18;
    const symbol = symbolResults[i]?.status === 'success' ? (symbolResults[i].result as string) : '???';

    const supplyBalance = convertAndDebtResults[i * 2]?.status === 'success'
      ? (convertAndDebtResults[i * 2].result as bigint) : 0n;
    const borrowBalance = convertAndDebtResults[i * 2 + 1]?.status === 'success'
      ? (convertAndDebtResults[i * 2 + 1].result as bigint) : 0n;
    const totalBalance = supplyBalance - borrowBalance;

    let supplyBalanceUsd_18 = 0n;
    let borrowBalanceUsd_18 = 0n;
    let totalBalanceUsd_18 = 0n;

    if (priceResults[i]?.status === 'success') {
      const [rawPrice, rawPriceDecimals] = priceResults[i].result as [bigint, bigint];
      const price_18 = to18(rawPrice, Number(rawPriceDecimals));
      supplyBalanceUsd_18 = (to18(supplyBalance, decimals) * price_18) / ONE_ETHER;
      borrowBalanceUsd_18 = (to18(borrowBalance, decimals) * price_18) / ONE_ETHER;
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
```

#### 7. Export new types and utilities from SDK

**File**: `packages/sdk/src/index.ts` (EDIT)

Add exports:
```typescript
export { type MarketSubstrateBalance } from './markets/market-balance.types';
export { extractEulerSubstrate, type EulerSubstrate } from './markets/euler-v2/utils/extract-euler-substrate';
export { generateSubAccountAddress } from './markets/euler-v2/utils/generate-sub-account-address';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] SDK tests pass (if any): `cd packages/sdk && pnpm test`

#### Manual Verification:
- [ ] Instantiate each market class and call `getBalances()` against a real vault

---

## Phase 2: Mastra Tool + Web UI + Agent

### Overview
Rename `getVaultAssetsTool` → `getMarketBalancesTool`, extend with market balance reading, update types, React component, and agent instructions.

### Changes Required:

#### 1. Update tool output types

**File**: `packages/mastra/src/tools/alpha/types.ts` (EDIT)

Replace `VaultAssetsOutput` with `MarketBalancesOutput`:

```typescript
/** Position in a DeFi market */
interface MarketPosition {
  underlyingToken: string;
  underlyingSymbol: string;
  supplyFormatted: string;
  supplyValueUsd: string;
  borrowFormatted: string;
  borrowValueUsd: string;
  totalValueUsd: string;
}

/** A DeFi market with its positions */
interface MarketAllocation {
  marketId: string;
  protocol: string;
  positions: MarketPosition[];
  totalValueUsd: string;
}

/** Displays the vault's ERC20 token holdings AND market allocations */
export type MarketBalancesOutput = {
  type: 'market-balances';
  success: boolean;
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
  message: string;
  error?: string;
};

export type AlphaToolOutput =
  | TransactionsToSignOutput
  | PendingActionsOutput
  | MarketBalancesOutput
  | SimulationResultOutput;
```

Update `index.ts` export to replace `VaultAssetsOutput` with `MarketBalancesOutput`.

#### 2. Rename and extend the tool

**File**: `packages/mastra/src/tools/alpha/get-vault-assets.ts` → rename to `get-market-balances.ts`

Key changes:
- Tool ID: `'get-market-balances'`
- Description updated to mention market allocations
- Output schema extended with `markets` array
- After reading ERC20 substrates (existing code), add:

```typescript
// NEW: Read market allocations
const marketIds = await plasmaVault.getMarketIds({ include: ['balanceFuses'] });
const activeMarketIds = marketIds.filter(id => id !== MARKET_ID.ERC20_VAULT_BALANCE);

const markets: MarketAllocation[] = [];

for (const marketId of activeMarketIds) {
  const marketName = getMarketName(marketId); // Reverse-lookup from MARKET_ID

  try {
    let balances: MarketSubstrateBalance[] = [];

    if (marketId === MARKET_ID.AAVE_V3 || marketId === MARKET_ID.AAVE_V3_LIDO) {
      const aaveV3 = new AaveV3(plasmaVault);
      balances = await aaveV3.getBalances();
    } else if (marketId === MARKET_ID.MORPHO) {
      const morpho = new Morpho(plasmaVault);
      balances = await morpho.getBalances();
    } else if (marketId === MARKET_ID.EULER_V2) {
      const eulerV2 = new EulerV2(plasmaVault);
      balances = await eulerV2.getBalances();
    }
    // Skip unknown markets

    if (balances.length > 0) {
      let marketTotalUsd = 0;
      const positions = balances.map(b => {
        const totalFloat = Number(b.totalBalanceUsd_18) / 1e18;
        marketTotalUsd += totalFloat;
        return {
          underlyingToken: b.underlyingTokenAddress,
          underlyingSymbol: b.underlyingTokenSymbol,
          supplyFormatted: formatUnits(b.supplyBalance, b.underlyingTokenDecimals),
          supplyValueUsd: (Number(b.supplyBalanceUsd_18) / 1e18).toFixed(2),
          borrowFormatted: formatUnits(b.borrowBalance, b.underlyingTokenDecimals),
          borrowValueUsd: (Number(b.borrowBalanceUsd_18) / 1e18).toFixed(2),
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
    }
  } catch {
    // Skip failed market reads
  }
}
```

Helper function to reverse-lookup market name:
```typescript
function getMarketName(marketId: bigint): string {
  for (const [name, id] of Object.entries(MARKET_ID)) {
    if (id === marketId) return name;
  }
  return `MARKET_${marketId}`;
}

function formatProtocolName(marketId: string): string {
  const names: Record<string, string> = {
    AAVE_V3: 'Aave V3',
    AAVE_V3_LIDO: 'Aave V3 Lido',
    MORPHO: 'Morpho',
    EULER_V2: 'Euler V2',
  };
  return names[marketId] ?? marketId;
}
```

#### 3. Update tool exports

**File**: `packages/mastra/src/tools/alpha/index.ts` (EDIT)

Replace `getVaultAssetsTool` export with `getMarketBalancesTool`.

#### 4. Update agent definition

**File**: `packages/mastra/src/agents/alpha-agent.ts` (EDIT)

- Import `getMarketBalancesTool` instead of `getVaultAssetsTool`
- Update tool registration: `getMarketBalancesTool` key
- Update instructions:
  - Replace "getVaultAssetsTool" references with "getMarketBalancesTool"
  - Add "Read market allocations (Aave V3, Morpho, Euler V2 positions)" to capabilities
  - Update workflow to mention market balances

#### 5. Create MarketBalancesList React component

**File**: `packages/web/src/vault-details/components/market-balances-list.tsx` (NEW)

A combined component that renders both ERC20 assets and market allocations:

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Coins, TrendingUp } from 'lucide-react';
import type { MarketBalancesOutput } from '@wgenie/fusion-mastra/alpha-types';

// Reuse formatBalance/formatUsd from vault-assets-list patterns

function AssetRow({ asset }) { /* Same as existing VaultAssetsList */ }

function MarketPositionRow({ position }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-500">
          {position.underlyingSymbol.slice(0, 3)}
        </div>
        <div>
          <p className="text-sm font-medium">{position.underlyingSymbol}</p>
          <p className="text-xs text-muted-foreground">
            Supply: {formatBalance(position.supplyFormatted)}
            {parseFloat(position.borrowFormatted) > 0 && ` · Borrow: ${formatBalance(position.borrowFormatted)}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{formatUsd(position.totalValueUsd)}</p>
      </div>
    </div>
  );
}

function MarketSection({ market }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{market.protocol}</p>
        <p className="text-xs font-medium">{formatUsd(market.totalValueUsd)}</p>
      </div>
      {market.positions.map((position, i) => (
        <MarketPositionRow key={i} position={position} />
      ))}
    </div>
  );
}

export function MarketBalancesList({ assets, markets, totalValueUsd, message }) {
  const hasAssets = assets.length > 0;
  const hasMarkets = markets.length > 0;

  if (!hasAssets && !hasMarkets) {
    return (
      <Card className="p-4 border-dashed border-2 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">No positions found</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        <p className="text-sm font-semibold">{formatUsd(totalValueUsd)}</p>
      </div>

      {hasAssets && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unallocated Tokens</p>
          {assets.map(asset => <AssetRow key={asset.address} asset={asset} />)}
        </div>
      )}

      {markets.map(market => (
        <MarketSection key={market.marketId} market={market} />
      ))}
    </Card>
  );
}
```

#### 6. Update AlphaToolRenderer

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx` (EDIT)

Replace `vault-assets` case with `market-balances`:

```tsx
import { MarketBalancesList } from './market-balances-list';

// In switch:
case 'market-balances':
  return (
    <MarketBalancesList
      assets={typed.assets}
      markets={typed.markets}
      totalValueUsd={typed.totalValueUsd}
      message={typed.message}
    />
  );
```

Remove `VaultAssetsList` import if no longer used.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] TypeScript compiles: `cd packages/web && pnpm tsc --noEmit`
- [ ] Mastra dev server starts: `pnpm dev:mastra`
- [ ] Web dev server starts: `pnpm dev:web`

#### Manual Verification:
- [ ] In Mastra Studio (`http://localhost:4111/agents/alpha-agent`): ask "what are the vault's balances?" for vault `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` on Base — should show ERC20 tokens (may have balances) and market sections (likely zeros for this vault)
- [ ] In web app (`http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/ask-ai`): same test
- [ ] Test against a vault with actual market allocations to verify non-zero market balances
- [ ] Verify the React component renders both sections correctly
- [ ] Compare balance values against `http://localhost:8088/fusion/base/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` for cross-reference

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:
- `extractEulerSubstrate` utility — test encoding/decoding
- `generateSubAccountAddress` utility — test XOR logic

### Integration Tests:
- Each market class `getBalances()` against a known vault with allocations

### Manual Testing Steps:
1. Start both dev servers (`pnpm dev:web`, `pnpm dev:mastra`)
2. Ask alpha agent about vault balances for test vault on Base
3. Verify ERC20 tokens section shows correctly (existing behavior preserved)
4. Verify market sections show (even if zeros for test vault)
5. Find a vault with actual market allocations and verify non-zero balances match external source

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0037-read-market balances.md`
- Reference ticket: `thoughts/kuba/tickets/fsn_0036-alpha-knows-assets.md`
- Web app balance implementations: `wgenie-webapp/src/fusion/markets/aaveV3/aave-v3-balances-mapper.ts`, `morpho/morpho-balances-mapper.ts`, `euler-v2/euler-v2-balances-mapper.ts`
- Existing tool: `packages/mastra/src/tools/alpha/get-vault-assets.ts`
- SDK market classes: `packages/sdk/src/markets/aave-v3/AaveV3.ts`, `morpho/Morpho.ts`, `euler-v2/EulerV2.ts`
- Market IDs: `packages/sdk/src/markets/market-id.ts`
