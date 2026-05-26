# YO Treasury Foundation — Implementation Plan

## Overview

First atomic task for the YO Treasury hackathon project. Creates the on-chain foundation: YO market module in `packages/sdk/`, address constants, ABIs, vault creation library, and comprehensive fork tests on Base. This proves the entire vault lifecycle works (create → configure → deposit → allocate to yoUSD → withdraw from yoUSD) before any frontend or agent work begins.

## Current State Analysis

### What exists:
- `@wgenie/fusion-sdk` exports `PlasmaVault` class with `addFuses()`, `addBalanceFuse()`, `grantMarketSubstrates()`, `grantRole()`, `execute()`
- `ERC4626_MARKET_ID` constants (`ERC4626_0001: 100_001n`, etc.) exported from SDK
- `erc4626SupplyFuseAbi` in `packages/ponder/abis/fuses/erc4626-supply-fuse.abi.ts` (JSON format, `as const satisfies Abi`)
- `universalTokenSwapperFuseAbi` in `packages/ponder/abis/fuses/universal-token-swapper-fuse.abi.ts`
- `plasmaVaultAbi` and `accessManagerAbi` exported from SDK
- Hardhat test infrastructure in `packages/hardhat-tests/` with Base fork support
- `FusionFactory.sol` source at `external/wgenie-fusion/contracts/factory/FusionFactory.sol`
- Market module pattern: `packages/sdk/src/markets/{name}/` with `abi/`, `*.addresses.ts`, `*.ts` class

### What's missing:
- `@yo-protocol/core` not installed
- No `packages/sdk/src/markets/yo/` module
- No FusionFactory TypeScript ABI
- No vault creation library
- No fork tests for vault creation + YO vault allocation

### Key discoveries:

- **`FusionFactory.clone()` has 5 params** (not 6 as in architecture doc): `(assetName, assetSymbol, underlyingToken, redemptionDelayInSeconds, owner)`. The doc's trailing `0n` doesn't exist.
- **`ACCESS_MANAGER_ROLE` is NOT exported** from SDK `index.ts` — role values must be defined in the YO market module
- **`PlasmaVault.grantRole(client, roleValue, account, timelockSeconds)`** takes raw bigint role value
- **Substrate encoding**: `pad(address, { size: 32 })` from viem — confirmed by `add-substrate.ts` test
- **SDK market pattern**: each market has `abi/` dir with JSON ABIs (`as const satisfies Abi`), `*.addresses.ts` using `createChainAddresses()`, and a market class

## Desired End State

After this plan is complete:
1. `packages/sdk/src/markets/yo/` — new market module with ABIs, addresses, types, vault creation utils
2. `packages/sdk/src/index.ts` — exports new YO market module items
3. `packages/hardhat-tests/test/yo-treasury/create-vault.ts` — fork test proving the lifecycle
4. `@yo-protocol/core` installed in workspace

### Verification:
- Fork test passes: `cd packages/hardhat-tests && pnpm hardhat test -- --grep "YO Treasury"`
- TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`

## What We're NOT Doing

- No frontend components (Phase 3)
- No Mastra agent or tools (Phase 2)
- No API routes
- No multi-chain beyond Base (happy path only — addresses for Ethereum/Arbitrum added later)
- No swap testing (UniversalTokenSwapperFuse needs aggregator API — separate task)
- No YO market class with `supply()`/`withdraw()` methods (can add later if needed — for now raw `encodeFunctionData` is fine for the fork test)

## Implementation Approach

Bottom-up: SDK market module (ABIs → addresses → types) → vault creation library → fork test. Follow the existing `packages/sdk/src/markets/aave-v3/` pattern for file organization.

---

## Phase 1: Dependencies & SDK Market Module

### Overview

Install `@yo-protocol/core`, create the `packages/sdk/src/markets/yo/` module with ABIs, addresses, role constants, and types. Follow the pattern of `aave-v3/`, `morpho/`, etc.

### Changes Required:

#### 1. Install `@yo-protocol/core`

```bash
cd packages/mastra && pnpm add @yo-protocol/core
cd packages/web && pnpm add @yo-protocol/core
```

#### 2. FusionFactory ABI

**File**: `packages/sdk/src/markets/yo/abi/fusion-factory.abi.ts` (new)

Minimal ABI covering only what we need — `clone` function. JSON format matching the SDK pattern.

```typescript
import { Abi } from 'viem';

export const fusionFactoryAbi = [
  {
    type: 'function',
    name: 'clone',
    inputs: [
      { name: 'assetName_', type: 'string', internalType: 'string' },
      { name: 'assetSymbol_', type: 'string', internalType: 'string' },
      { name: 'underlyingToken_', type: 'address', internalType: 'address' },
      { name: 'redemptionDelayInSeconds_', type: 'uint256', internalType: 'uint256' },
      { name: 'owner_', type: 'address', internalType: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct FusionFactoryLogicLib.FusionInstance',
        components: [
          { name: 'index', type: 'uint256', internalType: 'uint256' },
          { name: 'version', type: 'uint256', internalType: 'uint256' },
          { name: 'assetName', type: 'string', internalType: 'string' },
          { name: 'assetSymbol', type: 'string', internalType: 'string' },
          { name: 'assetDecimals', type: 'uint8', internalType: 'uint8' },
          { name: 'underlyingToken', type: 'address', internalType: 'address' },
          { name: 'underlyingTokenSymbol', type: 'string', internalType: 'string' },
          { name: 'underlyingTokenDecimals', type: 'uint8', internalType: 'uint8' },
          { name: 'initialOwner', type: 'address', internalType: 'address' },
          { name: 'plasmaVault', type: 'address', internalType: 'address' },
          { name: 'plasmaVaultBase', type: 'address', internalType: 'address' },
          { name: 'accessManager', type: 'address', internalType: 'address' },
          { name: 'feeManager', type: 'address', internalType: 'address' },
          { name: 'rewardsManager', type: 'address', internalType: 'address' },
          { name: 'withdrawManager', type: 'address', internalType: 'address' },
          { name: 'contextManager', type: 'address', internalType: 'address' },
          { name: 'priceManager', type: 'address', internalType: 'address' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 3. PlasmaVaultCreated Event ABI

**File**: `packages/sdk/src/markets/yo/abi/plasma-vault-factory.abi.ts` (new)

```typescript
import { Abi } from 'viem';

export const plasmaVaultFactoryAbi = [
  {
    type: 'event',
    name: 'PlasmaVaultCreated',
    inputs: [
      { name: 'index', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'plasmaVault', type: 'address', indexed: false, internalType: 'address' },
      { name: 'assetName', type: 'string', indexed: false, internalType: 'string' },
      { name: 'assetSymbol', type: 'string', indexed: false, internalType: 'string' },
      { name: 'underlyingToken', type: 'address', indexed: false, internalType: 'address' },
    ],
    anonymous: false,
  },
] as const satisfies Abi;
```

#### 4. ERC4626 Supply Fuse ABI (SDK copy)

**File**: `packages/sdk/src/markets/yo/abi/erc4626-supply-fuse.abi.ts` (new)

Copy the relevant `enter`/`exit` functions from `packages/ponder/abis/fuses/erc4626-supply-fuse.abi.ts` into the SDK market module. Only the functions needed for `encodeFunctionData`:

```typescript
import { Abi } from 'viem';

export const erc4626SupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct Erc4626SupplyFuseEnterData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          { name: 'vaultAssetAmount', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [
      {
        name: 'data_',
        type: 'tuple',
        internalType: 'struct Erc4626SupplyFuseExitData',
        components: [
          { name: 'vault', type: 'address', internalType: 'address' },
          { name: 'vaultAssetAmount', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 5. Address Constants

**File**: `packages/sdk/src/markets/yo/yo.addresses.ts` (new)

Uses `createChainAddresses()` utility matching the pattern in `aave-v3.addresses.ts`.

```typescript
import { base } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

// ─── FusionFactory ───
export const FUSION_FACTORY_ADDRESS = createChainAddresses({
  [base.id]: '0x1455717668fA96534f675856347A973fA907e922',
});

// ─── ERC4626SupplyFuse per slot (one per YO vault market) ───
export const ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS = createChainAddresses({
  [base.id]: '0xbe8ab5217F4f251E4A667650fc34a63035C231a8',
});
export const ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS = createChainAddresses({
  [base.id]: '0xed5Ec535e6e6a3051105A8Ea2E8Bd178951A9EAc',
});
export const ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS = createChainAddresses({
  [base.id]: '0xdA0711a0b1B1dD289c4D7C08704Dd1e4cceA80C1',
});
export const ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS = createChainAddresses({
  [base.id]: '0xb187050408857FC2a57be0a5618e39b331425E77',
});

// ─── ERC4626BalanceFuse per slot ───
export const ERC4626_BALANCE_FUSE_SLOT1_ADDRESS = createChainAddresses({
  [base.id]: '0x7F4D9EFdE7EfEBBAFbb506ca3f711764cBc96391',
});
export const ERC4626_BALANCE_FUSE_SLOT2_ADDRESS = createChainAddresses({
  [base.id]: '0x3Dfe25F60191AAee4213080398D2Fdf65EC3CF2F',
});
export const ERC4626_BALANCE_FUSE_SLOT3_ADDRESS = createChainAddresses({
  [base.id]: '0xfEe84b6AF26a481C1819655dAde5f5588416e19f',
});
export const ERC4626_BALANCE_FUSE_SLOT4_ADDRESS = createChainAddresses({
  [base.id]: '0x903c1ABb5A303Cf717196e8d12CE87F46dE56719',
});

// ─── UniversalTokenSwapperFuse ───
export const UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS = createChainAddresses({
  [base.id]: '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
});

// ─── YO Vault Addresses ───
export const YO_USD_ADDRESS = createChainAddresses({
  [base.id]: '0x0000000f2eb9f69274678c76222b35eec7588a65',
});
export const YO_ETH_ADDRESS = createChainAddresses({
  [base.id]: '0x3a43aec53490cb9fa922847385d82fe25d0e9de7',
});
export const YO_BTC_ADDRESS = createChainAddresses({
  [base.id]: '0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc',
});
export const YO_EUR_ADDRESS = createChainAddresses({
  [base.id]: '0x50c749ae210d3977adc824ae11f3c7fd10c871e9',
});

// ─── YoGateway ───
export const YO_GATEWAY_ADDRESS = createChainAddresses({
  [base.id]: '0xF1EeE0957267b1A474323Ff9CfF7719E964969FA',
});

// ─── Token Addresses ───
export const USDC_ADDRESS = createChainAddresses({
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
});
export const WETH_ADDRESS = createChainAddresses({
  [base.id]: '0x4200000000000000000000000000000000000006',
});
export const CBBTC_ADDRESS = createChainAddresses({
  [base.id]: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
});
export const EURC_ADDRESS = createChainAddresses({
  [base.id]: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
});

// ─── Swap Router Addresses ───
export const ODOS_ROUTER_ADDRESS = createChainAddresses({
  [base.id]: '0x19cEeAd7105607Cd444F5ad10dd51356436095a1',
});
export const KYBER_SWAP_ROUTER_ADDRESS = createChainAddresses({
  [base.id]: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5',
});
```

#### 6. Role Constants & Types

**File**: `packages/sdk/src/markets/yo/yo.constants.ts` (new)

```typescript
// Access Manager role values (raw bigint)
// Source: packages/sdk/src/access-manager/access-manager.types.ts
export const YO_TREASURY_ROLES = {
  OWNER: 1n,
  ATOMIST: 100n,
  ALPHA: 200n,
  FUSE_MANAGER: 300n,
  WHITELIST: 800n,
} as const;

// Slot → market ID mapping for YO vaults
// ERC4626_0001 = 100_001n is slot 1 (yoUSD), etc.
import { ERC4626_MARKET_ID, MARKET_ID } from '../market-id';

export const YO_VAULT_SLOTS = {
  yoUSD: { slot: 1, marketId: ERC4626_MARKET_ID.ERC4626_0001 },
  yoETH: { slot: 2, marketId: ERC4626_MARKET_ID.ERC4626_0002 },
  yoBTC: { slot: 3, marketId: ERC4626_MARKET_ID.ERC4626_0003 },
  yoEUR: { slot: 4, marketId: ERC4626_MARKET_ID.ERC4626_0004 },
} as const;

export const SWAP_MARKET_ID = MARKET_ID.UNIVERSAL_TOKEN_SWAPPER; // 12n
```

#### 7. Barrel Export

**File**: `packages/sdk/src/markets/yo/index.ts` (new)

```typescript
export { fusionFactoryAbi } from './abi/fusion-factory.abi';
export { plasmaVaultFactoryAbi } from './abi/plasma-vault-factory.abi';
export { erc4626SupplyFuseAbi as yoErc4626SupplyFuseAbi } from './abi/erc4626-supply-fuse.abi';
export * from './yo.addresses';
export * from './yo.constants';
```

#### 8. Update SDK Barrel Export

**File**: `packages/sdk/src/index.ts` (modify — append)

Add exports for the new YO market module:

```typescript
// YO Treasury market
export {
  fusionFactoryAbi,
  plasmaVaultFactoryAbi,
  yoErc4626SupplyFuseAbi,
  FUSION_FACTORY_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT1_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT2_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT3_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT4_ADDRESS,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
  YO_USD_ADDRESS,
  YO_ETH_ADDRESS,
  YO_BTC_ADDRESS,
  YO_EUR_ADDRESS,
  YO_GATEWAY_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
  CBBTC_ADDRESS,
  EURC_ADDRESS,
  ODOS_ROUTER_ADDRESS,
  KYBER_SWAP_ROUTER_ADDRESS,
  YO_TREASURY_ROLES,
  YO_VAULT_SLOTS,
  SWAP_MARKET_ID,
} from './markets/yo';
```

### Success Criteria:

#### Automated Verification:
- [ ] `@yo-protocol/core` installed: `cd packages/mastra && node -e "require('@yo-protocol/core')"`
- [ ] SDK TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] All new files importable from `@wgenie/fusion-sdk`

#### Manual Verification:
- [ ] All contract addresses match architecture doc (`02-architecture.md`)

**Implementation Note**: Proceed directly to Phase 2 — this is a data-only phase.

---

## Phase 2: Vault Creation Library

### Overview

Build vault creation utility functions inside the SDK YO market module. Pure functions that execute the multi-step vault creation sequence. Uses `PlasmaVault` SDK class where possible, raw viem calls only for factory `clone()`.

### Changes Required:

#### 1. Vault Creation Library

**File**: `packages/sdk/src/markets/yo/create-vault.ts` (new)

Each function returns a transaction hash or result. Designed to be called by:
- Frontend `CreateVaultFlow` stepper (Phase 3)
- Fork tests (this plan, Phase 3)

Key functions:

```typescript
import { type Address, type PublicClient, type WalletClient, pad, decodeEventLog, erc20Abi } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { ERC4626_MARKET_ID, MARKET_ID } from '../market-id';
import { fusionFactoryAbi } from './abi/fusion-factory.abi';
import { plasmaVaultFactoryAbi } from './abi/plasma-vault-factory.abi';
import { accessManagerAbi } from '../../abi/access-manager.abi';
import {
  FUSION_FACTORY_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS, ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT3_ADDRESS, ERC4626_SUPPLY_FUSE_SLOT4_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT1_ADDRESS, ERC4626_BALANCE_FUSE_SLOT2_ADDRESS,
  ERC4626_BALANCE_FUSE_SLOT3_ADDRESS, ERC4626_BALANCE_FUSE_SLOT4_ADDRESS,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
  YO_USD_ADDRESS, YO_ETH_ADDRESS, YO_BTC_ADDRESS, YO_EUR_ADDRESS,
  USDC_ADDRESS, WETH_ADDRESS, CBBTC_ADDRESS, EURC_ADDRESS,
  ODOS_ROUTER_ADDRESS, KYBER_SWAP_ROUTER_ADDRESS,
} from './yo.addresses';
import { YO_TREASURY_ROLES, SWAP_MARKET_ID } from './yo.constants';
import type { ChainId } from '../../fusion.types';

export interface VaultCreationResult {
  vaultAddress: Address;
  accessManagerAddress: Address;
  txHash: `0x${string}`;
}

export interface YoTreasuryConfig {
  chainId: ChainId;
  ownerAddress: Address;
  vaultName?: string;
  vaultSymbol?: string;
}
```

Functions (each exported individually):

1. **`cloneVault(publicClient, walletClient, config)`** → `Promise<VaultCreationResult>`
   - Calls `FusionFactory.clone()` with USDC as underlying, 1s redemption delay
   - Parses `PlasmaVaultCreated` event from receipt logs to get vault address
   - Creates `PlasmaVault` instance to read `accessManager` address
   - Returns `{ vaultAddress, accessManagerAddress, txHash }`

2. **`grantRoles(publicClient, walletClient, accessManagerAddress, ownerAddress)`** → `Promise<void>`
   - Grants ATOMIST (100n), FUSE_MANAGER (300n), ALPHA (200n), WHITELIST (800n)
   - Sequential `accessManagerAbi.grantRole()` calls

3. **`addFuses(publicClient, walletClient, vaultAddress, chainId)`** → `Promise<void>`
   - Uses `PlasmaVault.addFuses()` SDK method
   - Adds all 4 ERC4626SupplyFuses + UniversalTokenSwapperFuse

4. **`addBalanceFuses(publicClient, walletClient, vaultAddress, chainId)`** → `Promise<void>`
   - Uses `PlasmaVault.addBalanceFuse()` SDK method
   - Adds balance fuse for each of the 4 ERC4626 markets

5. **`configureSubstrates(publicClient, walletClient, vaultAddress, chainId)`** → `Promise<void>`
   - Uses `PlasmaVault.grantMarketSubstrates()` SDK method
   - Configures: 4 ERC4626 markets (one YO vault each) + swap market (tokens + routers)

6. **`updateDependencyGraphs(publicClient, walletClient, vaultAddress)`** → `Promise<void>`
   - Uses `PlasmaVault.updateDependencyBalanceGraph()` SDK method
   - Sets empty dependency arrays for all 4 markets

7. **`createAndConfigureVault(publicClient, walletClient, config)`** → `Promise<VaultCreationResult>`
   - Convenience function calling steps 1-6 sequentially
   - For tests and simple use cases

**Design decisions:**
- Each step is exported individually so the UI stepper can call them with progress tracking
- Uses `PlasmaVault` SDK methods where available (addFuses, addBalanceFuse, grantMarketSubstrates, etc.)
- Raw viem calls only for `FusionFactory.clone()` and `accessManagerAbi.grantRole()` (no SDK wrappers for these)
- `@ts-expect-error` for hardhat viem type mismatches (matches existing test patterns)

#### 2. Update Barrel Export

**File**: `packages/sdk/src/markets/yo/index.ts` (modify)

Add:
```typescript
export {
  cloneVault,
  grantRoles,
  addFuses,
  addBalanceFuses,
  configureSubstrates,
  updateDependencyGraphs,
  createAndConfigureVault,
  type VaultCreationResult,
  type YoTreasuryConfig,
} from './create-vault';
```

#### 3. Update SDK Barrel Export

**File**: `packages/sdk/src/index.ts` (modify)

Add the new vault creation exports to the YO section.

### Success Criteria:

#### Automated Verification:
- [ ] SDK TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] All imports resolve correctly from `@wgenie/fusion-sdk`

#### Manual Verification:
- [ ] Code review: functions match the vault creation sequence in `02-architecture.md`

**Implementation Note**: Proceed to Phase 3 after TypeScript compiles.

---

## Phase 3: Fork Tests

### Overview

Write a comprehensive Hardhat fork test on Base that exercises the entire vault lifecycle: create → configure → deposit USDC → allocate to yoUSD → verify yoUSD shares → withdraw from yoUSD → verify USDC returned.

### Changes Required:

#### 1. Fork Test

**File**: `packages/hardhat-tests/test/yo-treasury/create-vault.ts` (new)

Follows the exact pattern of `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts`:

```typescript
import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault, ERC4626_MARKET_ID } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { ANVIL_TEST_ACCOUNT } from '../../lib/test-accounts';
import { base } from 'viem/chains';
import { pad, erc20Abi, encodeFunctionData, parseUnits, type Address } from 'viem';
import '@nomicfoundation/hardhat-toolbox-viem';

// Import from SDK yo market module
import {
  fusionFactoryAbi,
  plasmaVaultFactoryAbi,
  yoErc4626SupplyFuseAbi,
  FUSION_FACTORY_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  YO_USD_ADDRESS,
  YO_TREASURY_ROLES,
  // ... other needed imports
} from '@wgenie/fusion-sdk';
```

**Test structure:**

```
describe('YO Treasury - vault creation and allocation lifecycle', { timeout: 120_000 })
├── before() → network.connect('hardhatBase', blockNumber: TBD)
├── after() → connection.close()
└── it('should create vault, configure, deposit, allocate to yoUSD, and withdraw')
    ├── Step 1: Clone vault via FusionFactory.clone()
    │   └── Assert: PlasmaVaultCreated event emitted, vault address found
    ├── Step 2: Grant roles (ATOMIST, FUSE_MANAGER, ALPHA, WHITELIST)
    │   └── Assert: plasmaVault.hasRole('ALPHA_ROLE', user) === true
    │   └── Assert: plasmaVault.hasRole('WHITELIST_ROLE', user) === true
    ├── Step 3: Add fuses (4 ERC4626SupplyFuses + UniversalTokenSwapper)
    │   └── Assert: plasmaVault.getFuses().length === 5
    ├── Step 4: Add balance fuses (4 ERC4626BalanceFuses)
    ├── Step 5: Configure substrates (yoUSD for slot 1)
    ├── Step 6: Update dependency balance graphs
    ├── Step 7: Fund user with USDC (impersonate whale, transfer 100 USDC)
    ├── Step 8: Deposit 100 USDC into vault (requires WHITELIST_ROLE)
    │   └── Assert: vault USDC balance === 100e6
    ├── Step 9: Allocate 50 USDC to yoUSD via PlasmaVault.execute()
    │   └── Encode: Erc4626SupplyFuse.enter({ vault: yoUSD, vaultAssetAmount: 50e6 })
    │   └── Assert: vault USDC balance decreased
    │   └── Assert: vault holds yoUSD shares > 0
    └── Step 10: Withdraw from yoUSD via PlasmaVault.execute()
        └── Encode: Erc4626SupplyFuse.exit({ vault: yoUSD, vaultAssetAmount: 50e6 })
        └── Assert: vault USDC balance increased back
```

**TBD during implementation:**
- `BLOCK_NUMBER` — pick a recent Base block where FusionFactory is deployed and USDC whale exists
- `USDC_WHALE` — find a large USDC holder on Base at pinned block (search via block explorer or test client)

**Key patterns from existing tests:**
- Use `ANVIL_TEST_ACCOUNT[0].address` as the user/owner
- Use `testClient.setBalance()` for gas funding
- Use `testClient.request({ method: 'hardhat_impersonateAccount' })` for whale + user
- Use `viem.getWalletClient(address)` for wallet clients
- Use `@ts-expect-error` for hardhat viem type mismatches with `PlasmaVault.create()`
- `accessManagerAbi.grantRole` takes `(uint64 roleId, address account, uint32 executionDelay)` — note `uint64` not `uint256` for roleId

### Success Criteria:

#### Automated Verification:
- [ ] Fork test passes: `cd packages/hardhat-tests && pnpm hardhat test -- --grep "YO Treasury"`
- [ ] Vault created with correct underlying USDC (verify `plasmaVault.assetAddress`)
- [ ] All roles granted including WHITELIST_ROLE (verify with `plasmaVault.hasRole`)
- [ ] All 5 fuses installed (verify with `plasmaVault.getFuses()`)
- [ ] Deposit of 100 USDC succeeds (requires WHITELIST_ROLE)
- [ ] `PlasmaVault.execute([Erc4626SupplyFuse.enter(yoUSD, 50 USDC)])` succeeds
- [ ] yoUSD shares > 0 in vault balance after allocation
- [ ] `PlasmaVault.execute([Erc4626SupplyFuse.exit(yoUSD, 50 USDC)])` succeeds
- [ ] USDC returns to vault after withdrawal
- [ ] TypeScript compiles in SDK and hardhat-tests packages

#### Manual Verification:
- [ ] Test output reviewed — all console.log values make sense
- [ ] No unexpected warnings or errors

**Implementation Note**: After this phase, the on-chain foundation is proven. Pause here for review before starting Phase 2 (AI Agent) or Phase 3 (Frontend).

---

## Testing Strategy

### Fork Tests:
- Single comprehensive test covering the full lifecycle
- Pinned to specific Base block for determinism
- Uses Hardhat test accounts (no real keys)
- Follows existing `packages/hardhat-tests/` patterns exactly

### What's NOT tested:
- Swap via UniversalTokenSwapperFuse (needs aggregator API — separate task)
- Multi-chain (Ethereum, Arbitrum — separate task)
- Frontend components (Phase 3)
- Agent tools (Phase 2)

## Performance Considerations

- Fork tests are slow (~60-120s) — use generous timeout (`{ timeout: 120_000 }`)
- 16+ sequential transactions for full vault setup — expected for hackathon
- `PlasmaVault.create()` fires 2 multicalls per instantiation

## New Files Summary

```
packages/sdk/src/markets/yo/           # NEW market module
├── index.ts                           # Barrel export
├── abi/
│   ├── fusion-factory.abi.ts          # FusionFactory.clone() ABI
│   ├── plasma-vault-factory.abi.ts    # PlasmaVaultCreated event ABI
│   └── erc4626-supply-fuse.abi.ts     # enter/exit for ERC4626SupplyFuse
├── yo.addresses.ts                    # All contract addresses per chain
├── yo.constants.ts                    # Role values, vault slot mapping
└── create-vault.ts                    # Vault creation utility functions

packages/hardhat-tests/test/yo-treasury/
└── create-vault.ts                    # Fork test: full vault lifecycle
```

## Modified Files Summary

```
packages/sdk/src/index.ts              # Add YO market exports
packages/mastra/package.json           # Add @yo-protocol/core dependency
packages/web/package.json              # Add @yo-protocol/core dependency
```

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0044-yo-implement-.md`
- Architecture doc: `thoughts/kuba/notes/yo-hackathon/project-plan/02-architecture.md`
- Implementation phases: `thoughts/kuba/notes/yo-hackathon/project-plan/03-implementation-phases.md`
- FusionFactory Solidity: `external/wgenie-fusion/contracts/factory/FusionFactory.sol:112-128`
- FusionInstance struct: `external/wgenie-fusion/contracts/factory/lib/FusionFactoryLogicLib.sol:34-52`
- Existing add-fuses test: `packages/hardhat-tests/test/plasma-vault/add-fuses.ts`
- Existing add-substrate test: `packages/hardhat-tests/test/plasma-vault/add-substrate.ts`
- Existing alpha-execute test: `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts`
- SDK market pattern: `packages/sdk/src/markets/aave-v3/` (addresses, ABIs, class)
- SDK PlasmaVault class: `packages/sdk/src/PlasmaVault.ts`
- SDK market IDs: `packages/sdk/src/markets/market-id.ts`
- SDK access manager roles: `packages/sdk/src/access-manager/access-manager.types.ts:41-224`
