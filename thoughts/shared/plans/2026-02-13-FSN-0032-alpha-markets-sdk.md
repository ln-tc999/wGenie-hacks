# FSN-0032: SDK for Aave V3, Morpho, and Euler V2 Markets — Implementation Plan

## Overview

Create market SDK classes for Aave V3, Morpho, and Euler V2 in `packages/sdk/src/markets/`. Each class wraps `PlasmaVault` and provides domain-specific methods (supply, withdraw, borrow, repay) that return `FuseAction[]` arrays. Port the pattern from the existing `wgenie-webapp` implementation into the monorepo SDK. Test via Hardhat fork tests against real mainnet vaults.

## Current State Analysis

### What Exists
- **PlasmaVault SDK** (`packages/sdk/src/PlasmaVault.ts`): Full class with `execute()`, role management, market substrates, etc.
- **Market IDs** (`packages/sdk/src/markets/market-id.ts`): `AAVE_V3: 1n`, `EULER_V2: 11n`, `MORPHO: 14n` already defined
- **Morpho ABI + addresses** (`packages/sdk/src/markets/morpho/`): `morpho.abi.ts` (Morpho Blue protocol ABI) and `morpho.addresses.ts` already exist
- **Empty test files**: `packages/hardhat-tests/test/markets/{aave-v3.ts, morpho.ts, euler-v2.ts}` and `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts` exist but are empty (1 line each)
- **Hardhat config**: Only supports `hardhatMainnet` (l1) and `hardhatBase` (op) networks — no Arbitrum

### What Needs to Be Created
- **Aave V3 market class** + fuse ABIs + fuse addresses
- **Morpho market class** + fuse ABIs (supply/borrow) + fuse addresses
- **Euler V2 market class** + fuse ABIs (supply/borrow) + fuse addresses + substrate utilities
- **Hardhat fork tests** for all three markets
- **SDK exports** for new classes

### Reference Implementation
The `wgenie-webapp` has a mature `AaveV3` class at `src/fusion/markets/aaveV3/AaveV3.ts` that follows this pattern:
1. Constructor takes `PlasmaVault`
2. Methods resolve fuse address for current chain
3. Methods encode fuse `enter()`/`exit()` calldata via `encodeFunctionData()`
4. Methods return `FuseAction[]` (array of `{fuse, data}`)
5. User passes result to `plasmaVault.execute(walletClient, [actions])`

## Desired End State

After implementation:
1. Users can `import { AaveV3, Morpho, EulerV2 } from '@wgenie/fusion-sdk'`
2. Each class provides `supply()` and `withdraw()` returning `FuseAction[]`
3. `AaveV3` additionally provides `borrow()` and `repay()`
4. `Morpho` additionally provides `borrow()` and `repay()`
5. `EulerV2` provides `supply()` and `withdraw()` (borrow via collateral/controller fuses is complex — out of scope for initial implementation)
6. Hardhat fork tests verify supply/withdraw against real mainnet vaults
7. All tests pass: `cd packages/hardhat-tests && pnpm hardhat test test/markets/`

## What We're NOT Doing

- Balance query methods (getBalance, getTokenBalances) — these require protocol-specific reads (Aave pool data provider, Morpho position(), Euler ERC4626 balanceOf) and are read-side concerns best left to the frontend
- Euler V2 borrow/collateral/controller fuses — complex multi-fuse orchestration with subaccount management
- Euler V2 batch fuse / flash loan operations
- Morpho collateral fuse / flash loan fuse
- Morpho rewards fuse
- Hardhat config for Arbitrum (tests will use mainnet only)
- Any changes to `PlasmaVault.ts` itself

## Implementation Approach

Port the webapp's class-based market pattern into the SDK, keeping it simple:
- One class per market with a constructor taking `PlasmaVault`
- Fuse ABIs as const arrays in dedicated files (ported from webapp `generated.ts`)
- Fuse addresses via `createChainAddresses()` (already in SDK)
- Methods use `encodeFunctionData()` from viem and return `FuseAction[]`

---

## Phase 1: Aave V3 Market

### Overview
Create `AaveV3` class with supply, withdraw, borrow, repay methods and supporting fuse ABIs/addresses.

### Changes Required:

#### 1. Aave V3 Supply Fuse ABI
**File**: `packages/sdk/src/markets/aave-v3/abi/aave-v3-supply-fuse.abi.ts` (new)
**Changes**: Port `aaveV3SupplyFuseV003Abi` from webapp. Only include the function items needed (`enter`, `exit`, `MARKET_ID`, `VERSION`).

```typescript
import { Abi } from 'viem';

export const aaveV3SupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct AaveV3SupplyFuseEnterData',
      components: [
        { name: 'asset', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' },
        { name: 'userEModeCategoryId', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct AaveV3SupplyFuseExitData',
      components: [
        { name: 'asset', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 2. Aave V3 Borrow Fuse ABI
**File**: `packages/sdk/src/markets/aave-v3/abi/aave-v3-borrow-fuse.abi.ts` (new)
**Changes**: Port `aaveV3BorrowFuseV001Abi` from webapp.

```typescript
import { Abi } from 'viem';

export const aaveV3BorrowFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct AaveV3BorrowFuseEnterData',
      components: [
        { name: 'asset', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct AaveV3BorrowFuseExitData',
      components: [
        { name: 'asset', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 3. Aave V3 Fuse Addresses
**File**: `packages/sdk/src/markets/aave-v3/aave-v3.addresses.ts` (new)
**Changes**: Define supply and borrow fuse addresses per chain.

```typescript
import { mainnet, arbitrum, base, plasma, avalanche } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

export const AAVE_V3_SUPPLY_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0x7b3957B38b1c91057755D71701247905b48D6063',
  [arbitrum.id]: '0x304756cD719382281fBD640f5F7932465eD663D6',
  [base.id]: '0x26fD6EF391E98C78CfCA27e00c3d15be4D941625',
  [plasma.id]: '0x9B64e01c16CbFfB0D42d89a5Df73B7f8909dff05',
  [avalanche.id]: '0x97e36bA4d86824738c83b91b7b983d36c75a1946',
});

export const AAVE_V3_BORROW_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0x820D879Ef89356B93A7c71ADDBf45c40a0dDE453',
  [arbitrum.id]: '0x28264E8b70902f6C55420EAF66AeeE12b602302E',
  [base.id]: '0x1Df60F2A046F3Dce8102427e091C1Ea99aE1d774',
  [plasma.id]: '0xA072E8ff01fec4e09808968220bFF4DD2262e320',
  [avalanche.id]: '0x27049822E8F40D194Ac5A0b0107255Ec12cd4e82',
});
```

#### 4. AaveV3 Market Class
**File**: `packages/sdk/src/markets/aave-v3/AaveV3.ts` (new)
**Changes**: Port from webapp `AaveV3.ts`, adapting to SDK's `createChainAddresses` pattern.

```typescript
import { Address, encodeFunctionData } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { FuseAction } from '../../fusion.types';
import { aaveV3SupplyFuseAbi } from './abi/aave-v3-supply-fuse.abi';
import { aaveV3BorrowFuseAbi } from './abi/aave-v3-borrow-fuse.abi';
import { AAVE_V3_SUPPLY_FUSE_ADDRESS, AAVE_V3_BORROW_FUSE_ADDRESS } from './aave-v3.addresses';

export class AaveV3 {
  constructor(private readonly plasmaVault: PlasmaVault) {}

  supply(assetAddress: Address, amount: bigint): FuseAction[] {
    const fuseAddress = AAVE_V3_SUPPLY_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`AaveV3 supply fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: aaveV3SupplyFuseAbi,
      functionName: 'enter',
      args: [{ asset: assetAddress, amount, userEModeCategoryId: 0n }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  withdraw(assetAddress: Address, amount: bigint): FuseAction[] {
    const fuseAddress = AAVE_V3_SUPPLY_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`AaveV3 supply fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: aaveV3SupplyFuseAbi,
      functionName: 'exit',
      args: [{ asset: assetAddress, amount }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  borrow(assetAddress: Address, amount: bigint): FuseAction[] {
    const fuseAddress = AAVE_V3_BORROW_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`AaveV3 borrow fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: aaveV3BorrowFuseAbi,
      functionName: 'enter',
      args: [{ asset: assetAddress, amount }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  repay(assetAddress: Address, amount: bigint): FuseAction[] {
    const fuseAddress = AAVE_V3_BORROW_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`AaveV3 borrow fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: aaveV3BorrowFuseAbi,
      functionName: 'exit',
      args: [{ asset: assetAddress, amount }],
    });
    return [{ fuse: fuseAddress, data }];
  }
}
```

#### 5. Export AaveV3 from SDK index
**File**: `packages/sdk/src/index.ts`
**Changes**: Add export line.

```typescript
export { AaveV3 } from './markets/aave-v3/AaveV3';
```

#### 6. Hardhat Fork Test for Aave V3
**File**: `packages/hardhat-tests/test/markets/aave-v3.ts`
**Changes**: Write fork test using wGenie USDC Prime vault on mainnet (block 21904278).

```typescript
import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { AaveV3 } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { mainnet } from 'viem/chains';
import '@nomicfoundation/hardhat-toolbox-viem';

describe('AaveV3 Market - supply and withdraw', { timeout: 60_000 }, () => {
  const BLOCK_NUMBER = 21904278;
  const PLASMA_VAULT = '0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2';
  const ALPHA = '0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6';

  let connection: NetworkConnection<'l1'>;

  before(async () => {
    connection = await network.connect({
      network: 'hardhatMainnet',
      chainType: 'l1',
      override: {
        forking: { url: env.RPC_URL_MAINNET, blockNumber: BLOCK_NUMBER },
      },
    });
  });

  after(async () => { await connection.close(); });

  it('should supply and withdraw USDC via AaveV3', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();

    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);
    const aaveV3 = new AaveV3(plasmaVault);

    // Impersonate alpha
    await testClient.request({ method: 'hardhat_impersonateAccount', params: [ALPHA] });
    const alphaClient = await viem.getWalletClient(ALPHA);
    await testClient.setBalance({ address: ALPHA, value: BigInt(1e18) });

    const assetAddress = plasmaVault.assetAddress;
    const supplyAmount = 1_000_000000n; // 1000 USDC

    // Supply
    const supplyActions = aaveV3.supply(assetAddress, supplyAmount);
    expect(supplyActions).to.have.lengthOf(1);
    await plasmaVault.execute(alphaClient, [supplyActions]);

    // Withdraw
    const withdrawAmount = 500_000000n; // 500 USDC
    const withdrawActions = aaveV3.withdraw(assetAddress, withdrawAmount);
    expect(withdrawActions).to.have.lengthOf(1);
    await plasmaVault.execute(alphaClient, [withdrawActions]);
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] Aave V3 test passes: `cd packages/hardhat-tests && pnpm hardhat test test/markets/aave-v3.ts`

#### Manual Verification:
- [ ] Verify fuse addresses match deployed contracts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Morpho Market

### Overview
Create `Morpho` class with supply, withdraw, borrow, repay methods. Morpho uses `bytes32 morphoMarketId` to identify specific lending markets (not just asset address).

### Changes Required:

#### 1. Morpho Supply Fuse ABI
**File**: `packages/sdk/src/markets/morpho/abi/morpho-supply-fuse.abi.ts` (new)

```typescript
import { Abi } from 'viem';

export const morphoSupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct MorphoSupplyFuseEnterData',
      components: [
        { name: 'morphoMarketId', type: 'bytes32', internalType: 'bytes32' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct MorphoSupplyFuseExitData',
      components: [
        { name: 'morphoMarketId', type: 'bytes32', internalType: 'bytes32' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 2. Morpho Borrow Fuse ABI
**File**: `packages/sdk/src/markets/morpho/abi/morpho-borrow-fuse.abi.ts` (new)

```typescript
import { Abi } from 'viem';

export const morphoBorrowFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct MorphoBorrowFuseEnterData',
      components: [
        { name: 'morphoMarketId', type: 'bytes32', internalType: 'bytes32' },
        { name: 'amountToBorrow', type: 'uint256', internalType: 'uint256' },
        { name: 'sharesToBorrow', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct MorphoBorrowFuseExitData',
      components: [
        { name: 'morphoMarketId', type: 'bytes32', internalType: 'bytes32' },
        { name: 'amountToRepay', type: 'uint256', internalType: 'uint256' },
        { name: 'sharesToRepay', type: 'uint256', internalType: 'uint256' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 3. Morpho Fuse Addresses
**File**: `packages/sdk/src/markets/morpho/morpho-fuse.addresses.ts` (new)

```typescript
import { mainnet, arbitrum, base, unichain } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

export const MORPHO_SUPPLY_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0xD08Cb606CEe700628E55b0B0159Ad65421E6c8Df',
  [base.id]: '0xae93EF3cf337b9599F0dfC12520c3C281637410F',
  [unichain.id]: '0xea13241E2D0EF964Ee616151e72d493496A568F5',
  [arbitrum.id]: '0x5Ea9d92fb3975f9f9d1Fa69b98A37BF4dDe61e2a',
});

export const MORPHO_BORROW_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0x9981e75b7254fD268C9182631Bf89C86101359d6',
  [base.id]: '0x35f44aD1D9F2773dA05F4664bf574C760bA47bf6',
  [unichain.id]: '0x8A84b69aFCCAC94b5Fb0a4894D0fA016dB2CF020',
});
```

#### 4. Morpho Market Class
**File**: `packages/sdk/src/markets/morpho/Morpho.ts` (new)

Key difference from AaveV3: Methods take `morphoMarketId: Hex` (bytes32) instead of `assetAddress`.

```typescript
import { Address, Hex, encodeFunctionData } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { FuseAction } from '../../fusion.types';
import { morphoSupplyFuseAbi } from './abi/morpho-supply-fuse.abi';
import { morphoBorrowFuseAbi } from './abi/morpho-borrow-fuse.abi';
import { MORPHO_SUPPLY_FUSE_ADDRESS, MORPHO_BORROW_FUSE_ADDRESS } from './morpho-fuse.addresses';

export class Morpho {
  constructor(private readonly plasmaVault: PlasmaVault) {}

  supply(morphoMarketId: Hex, amount: bigint): FuseAction[] {
    const fuseAddress = MORPHO_SUPPLY_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`Morpho supply fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: morphoSupplyFuseAbi,
      functionName: 'enter',
      args: [{ morphoMarketId, amount }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  withdraw(morphoMarketId: Hex, amount: bigint): FuseAction[] {
    const fuseAddress = MORPHO_SUPPLY_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`Morpho supply fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: morphoSupplyFuseAbi,
      functionName: 'exit',
      args: [{ morphoMarketId, amount }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  borrow(morphoMarketId: Hex, amountToBorrow: bigint): FuseAction[] {
    const fuseAddress = MORPHO_BORROW_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`Morpho borrow fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: morphoBorrowFuseAbi,
      functionName: 'enter',
      args: [{ morphoMarketId, amountToBorrow, sharesToBorrow: 0n }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  repay(morphoMarketId: Hex, amountToRepay: bigint): FuseAction[] {
    const fuseAddress = MORPHO_BORROW_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`Morpho borrow fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: morphoBorrowFuseAbi,
      functionName: 'exit',
      args: [{ morphoMarketId, amountToRepay, sharesToRepay: 0n }],
    });
    return [{ fuse: fuseAddress, data }];
  }
}
```

#### 5. Export Morpho from SDK index
**File**: `packages/sdk/src/index.ts`
**Changes**: Add export line.

```typescript
export { Morpho } from './markets/morpho/Morpho';
```

#### 6. Hardhat Fork Test for Morpho
**File**: `packages/hardhat-tests/test/markets/morpho.ts`
**Changes**: Write fork test. Use wGenie USDC Prime vault on mainnet at block 21904278 (same vault used for Aave V3 test — it has Morpho supply fuse installed). Alternatively find a vault with morpho supply fuse at test time.

This test is more complex because we need a vault that has Morpho fuses installed. We'll use the wGenie USDC Prime vault and check if it already has the Morpho supply fuse, or add it via the fuse manager.

```typescript
import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault, Morpho } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import '@nomicfoundation/hardhat-toolbox-viem';

describe('Morpho Market - supply and withdraw', { timeout: 60_000 }, () => {
  // Use a vault that has Morpho fuses; determine exact vault/block during implementation
  // ...test body similar to AaveV3...
});
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] Morpho test passes: `cd packages/hardhat-tests && pnpm hardhat test test/markets/morpho.ts`

#### Manual Verification:
- [ ] Verify fuse addresses match deployed contracts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Euler V2 Market

### Overview
Create `EulerV2` class with supply and withdraw methods. Euler V2 uses an `eulerVault` address + `subAccount` byte to identify lending positions, unlike Aave's simple asset address or Morpho's market ID.

### Changes Required:

#### 1. Euler V2 Supply Fuse ABI
**File**: `packages/sdk/src/markets/euler-v2/abi/euler-v2-supply-fuse.abi.ts` (new)

```typescript
import { Abi } from 'viem';

export const eulerV2SupplyFuseAbi = [
  {
    type: 'function',
    name: 'enter',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct EulerV2SupplyFuseEnterData',
      components: [
        { name: 'eulerVault', type: 'address', internalType: 'address' },
        { name: 'maxAmount', type: 'uint256', internalType: 'uint256' },
        { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'exit',
    inputs: [{
      name: 'data_',
      type: 'tuple',
      internalType: 'struct EulerV2SupplyFuseExitData',
      components: [
        { name: 'eulerVault', type: 'address', internalType: 'address' },
        { name: 'maxAmount', type: 'uint256', internalType: 'uint256' },
        { name: 'subAccount', type: 'bytes1', internalType: 'bytes1' },
      ],
    }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
```

#### 2. Euler V2 Fuse Addresses
**File**: `packages/sdk/src/markets/euler-v2/euler-v2.addresses.ts` (new)

```typescript
import { mainnet, arbitrum, base, unichain, plasma, avalanche } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

export const EULER_V2_SUPPLY_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0xDd33b4b6b9A7aA6fcC5F1D1c8ebB649A796Fd5B5',
  [arbitrum.id]: '0x920f6c81666877490A8D6dcFEFd85d151Ef04B7d',
  [base.id]: '0x96901b9A10f2A7f856a97ff148c4Cf3A0077d1ab',
  [unichain.id]: '0xBf8759c387b9C44aD304B0778c12437A520f93A1',
  [plasma.id]: '0xe0497Ffee6cdf82e87b011BF44090e4ec1269E70',
  [avalanche.id]: '0xdD02ad9A1d40FE1BA14812729db1272EF42A497F',
});
```

#### 3. EulerV2 Market Class
**File**: `packages/sdk/src/markets/euler-v2/EulerV2.ts` (new)

Key difference: Methods take `eulerVault: Address` and `subAccount: Hex` (bytes1, defaults to `'0x00'`).

```typescript
import { Address, Hex, encodeFunctionData } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { FuseAction } from '../../fusion.types';
import { eulerV2SupplyFuseAbi } from './abi/euler-v2-supply-fuse.abi';
import { EULER_V2_SUPPLY_FUSE_ADDRESS } from './euler-v2.addresses';

export class EulerV2 {
  constructor(private readonly plasmaVault: PlasmaVault) {}

  supply(eulerVault: Address, maxAmount: bigint, subAccount: Hex = '0x00'): FuseAction[] {
    const fuseAddress = EULER_V2_SUPPLY_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`EulerV2 supply fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: eulerV2SupplyFuseAbi,
      functionName: 'enter',
      args: [{ eulerVault, maxAmount, subAccount }],
    });
    return [{ fuse: fuseAddress, data }];
  }

  withdraw(eulerVault: Address, maxAmount: bigint, subAccount: Hex = '0x00'): FuseAction[] {
    const fuseAddress = EULER_V2_SUPPLY_FUSE_ADDRESS[this.plasmaVault.chainId];
    if (!fuseAddress) {
      throw new Error(`EulerV2 supply fuse not available on chain ${this.plasmaVault.chainId}`);
    }
    const data = encodeFunctionData({
      abi: eulerV2SupplyFuseAbi,
      functionName: 'exit',
      args: [{ eulerVault, maxAmount, subAccount }],
    });
    return [{ fuse: fuseAddress, data }];
  }
}
```

#### 4. Export EulerV2 from SDK index
**File**: `packages/sdk/src/index.ts`
**Changes**: Add export line.

```typescript
export { EulerV2 } from './markets/euler-v2/EulerV2';
```

#### 5. Hardhat Fork Test for Euler V2
**File**: `packages/hardhat-tests/test/markets/euler-v2.ts`
**Changes**: Fork test using a mainnet vault that has Euler V2 fuses. The Euler V2 tests from Foundry use block 23485836 and Euler vault `0xe0a80d35bB6618CBA260120b279d357978c42BCE` (USDC).

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/sdk && pnpm tsc --noEmit`
- [ ] Euler V2 test passes: `cd packages/hardhat-tests && pnpm hardhat test test/markets/euler-v2.ts`

#### Manual Verification:
- [ ] Verify fuse addresses match deployed contracts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 4: Alpha Execute Test

### Overview
Write the `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts` test that demonstrates using `plasmaVault.execute()` directly with raw `FuseAction` arrays, independent of the market classes.

### Changes Required:

#### 1. Alpha Execute Test
**File**: `packages/hardhat-tests/test/plasma-vault/alpha-execute.ts`
**Changes**: Test that an alpha wallet can execute fuse actions on a vault.

Uses the wGenie USDC Prime vault on mainnet, impersonates the alpha address, and executes a supply+withdraw cycle using AaveV3 market class (or raw encodeFunctionData).

### Success Criteria:

#### Automated Verification:
- [ ] Test passes: `cd packages/hardhat-tests && pnpm hardhat test test/plasma-vault/alpha-execute.ts`

---

## Phase 5: Env Configuration for Hardhat Tests

### Overview
If needed, add `RPC_URL_ARBITRUM` to env validation so Arbitrum fork tests work (currently only `RPC_URL_MAINNET` and `RPC_URL_BASE` are validated). Also add Arbitrum network to hardhat config if needed for Arbitrum tests.

### Changes Required:
Only if Arbitrum tests are needed. For the initial implementation, all tests will use mainnet forks.

---

## Testing Strategy

### Unit Tests (vitest in SDK):
- Not required for this phase — the market classes are thin wrappers around `encodeFunctionData`

### Integration Tests (Hardhat fork):
- **Aave V3**: Supply USDC, withdraw USDC on mainnet fork (wGenie USDC Prime vault)
- **Morpho**: Supply to a Morpho market on mainnet fork
- **Euler V2**: Supply to an Euler V2 vault on mainnet fork
- **Alpha Execute**: Direct execute() call demonstration

### Manual Testing Steps:
1. Verify fuse addresses match deployed contracts on Etherscan
2. Verify market class methods produce correct calldata by decoding the returned `FuseAction.data`

## New Files Summary

```
packages/sdk/src/markets/aave-v3/
├── AaveV3.ts
├── aave-v3.addresses.ts
└── abi/
    ├── aave-v3-supply-fuse.abi.ts
    └── aave-v3-borrow-fuse.abi.ts

packages/sdk/src/markets/morpho/
├── Morpho.ts                      (new)
├── morpho-fuse.addresses.ts       (new)
├── morpho.addresses.ts            (existing - Morpho protocol address)
├── abi/
│   ├── morpho.abi.ts              (existing - Morpho protocol ABI)
│   ├── morpho-supply-fuse.abi.ts  (new)
│   └── morpho-borrow-fuse.abi.ts  (new)

packages/sdk/src/markets/euler-v2/
├── EulerV2.ts
├── euler-v2.addresses.ts
└── abi/
    └── euler-v2-supply-fuse.abi.ts
```

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0032-alpha-chat.md`
- Related ticket: `thoughts/kuba/tickets/fsn_0031-alpha-agent.md`
- Webapp AaveV3 class: `/Users/kuba/wgenie-labs/wgenie-webapp/src/fusion/markets/aaveV3/AaveV3.ts`
- SDK PlasmaVault class: `packages/sdk/src/PlasmaVault.ts`
- Existing market IDs: `packages/sdk/src/markets/market-id.ts`
- Fuse ABIs (webapp): `wgenie-webapp/src/fusion/fuses/config/`
