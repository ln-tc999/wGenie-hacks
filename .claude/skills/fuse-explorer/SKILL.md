---
name: fuse-explorer
description: Find, list, and understand wGenie Fusion fuses. Use when the user asks about fuses, wants to find specific fuses, list fuses by protocol, understand fuse interfaces, or navigate the fuse codebase.
allowed-tools: Glob, Grep, Read, Bash
---

# Fuse Explorer

Navigate and understand the wGenie Fusion fuse ecosystem. Fuses are smart contract adapters that allow Plasma Vaults to interact with DeFi protocols.

## What Are Fuses?

Fuses are standardized smart contract interfaces that:
- Connect Plasma Vaults to external DeFi protocols (Aave, Uniswap, Morpho, etc.)
- Implement `enter()` and `exit()` functions for protocol interactions
- Track balances in USD (18 decimals) via `IMarketBalanceFuse`
- Are identified by `MARKET_ID()` for categorization

## Key Locations

### Solidity Contracts
```
external/wgenie-fusion/contracts/fuses/
├── IFuse.sol                    # Core interface (enter/exit)
├── IFuseCommon.sol              # Common interface (MARKET_ID)
├── IMarketBalanceFuse.sol       # Balance tracking interface
├── [protocol]/                  # Protocol-specific fuses
│   ├── [Protocol]BalanceFuse.sol
│   ├── [Protocol]SupplyFuse.sol
│   └── README.md                # Protocol documentation
```

### Generated TypeScript ABIs
```
packages/ponder/abis/fuses/
├── [protocol]-[action]-fuse.abi.ts    # Individual ABI files
└── ...
packages/ponder/abis/all-fuses-events.ts  # Merged events from all fuses
```

### Foundry Build Outputs
```
external/wgenie-fusion/out/[ContractName].sol/[ContractName].json
```

## Fuse Categories (36 Protocols, 113+ Fuses)

### Lending Protocols
| Protocol | Fuses | Description |
|----------|-------|-------------|
| aave_v2 | Balance, Supply | Aave V2 lending |
| aave_v3 | Balance, Borrow, Collateral, Supply, WithPriceOracleMiddlewareBalance | Aave V3 lending |
| compound_v2 | Balance, Supply | Compound V2 |
| compound_v3 | Balance, Supply | Compound V3 |
| euler | Balance, Batch, Borrow, Collateral, Controller, Supply | Euler V2 |
| moonwell | Balance, Borrow, EnableMarket, Supply | Moonwell lending |
| morpho | Balance, Borrow, Collateral, FlashLoan, OnlyLiquidityBalance, Supply, SupplyWithCallBackData | Morpho Blue |
| silo_v2 | Balance, Borrow, SupplyBorrowableCollateral, SupplyNonBorrowableCollateral | Silo V2 |
| spark | Balance, Supply | Spark Protocol |
| liquity | Balance, StabilityPool | Liquity stability pool |
| ebisu | AdjustInterestRate, AdjustTrove, ZapperBalance, ZapperCreate, ZapperLeverModify | Ebisu CDP |

### DEX & AMM Protocols
| Protocol | Fuses | Description |
|----------|-------|-------------|
| uniswap | V2Swap, V3Collect, V3ModifyPosition, V3NewPosition, V3Swap | Uniswap V2/V3 |
| balancer | Balance, Gauge, LiquidityProportional, LiquidityUnbalanced, SingleToken | Balancer V2 |
| aerodrome | Balance, ClaimFees, Gauge, Liquidity | Aerodrome (Base) |
| aerodrome_slipstream | Balance, CLGauge, Collect, ModifyPosition, NewPosition | Aerodrome CL |
| velodrome_superchain | Balance, Gauge, Liquidity | Velodrome Superchain |
| velodrome_superchain_slipstream | Balance, Collect, LeafCLGauge, ModifyPosition, NewPosition | Velodrome CL |
| ramses | V2Collect, V2ModifyPosition, V2NewPosition | Ramses V2 |
| curve_gauge | ChildLiquidityGaugeBalance, ChildLiquidityGaugeErc4626Balance, ChildLiquidityGaugeSupply | Curve gauges |
| curve_stableswap_ng | SingleSideBalance, SingleSideSupply | Curve Stableswap NG |

### Yield & Staking
| Protocol | Fuses | Description |
|----------|-------|-------------|
| stake_dao_v2 | Balance, Supply | Stake DAO |
| gearbox_v3 | FarmBalance, FarmSupply | Gearbox V3 |
| fluid_instadapp | StakingBalance, StakingSupply | Fluid/Instadapp |
| harvest | DoHardWork | Harvest Finance |
| pendle | RedeemPTAfterMaturity, SwapPT | Pendle Finance |
| tac | StakingBalance, StakingDelegate, StakingEmergency, StakingRedelegate | TAC staking |
| yield_basis | LtBalance, LtSupply | Yield Basis |

### Execution & Routing
| Protocol | Fuses | Description |
|----------|-------|-------------|
| async_action | AsyncAction, AsyncActionBalance | Multi-step async operations |
| enso | Enso, EnsoBalance, EnsoInitExecutor | DeFi routing/aggregation |
| universal_token_swapper | Swapper, SwapperEth, SwapperWithVerification | Token swaps |

### Basic Assets
| Protocol | Fuses | Description |
|----------|-------|-------------|
| erc20 | Balance | ERC20 token balance |
| erc4626 | Balance, Supply | ERC4626 vault integration |
| st_eth_wrapper | StEthWrapper | Lido stETH wrapping |

### Plasma Vault Operations
| Protocol | Fuses | Description |
|----------|-------|-------------|
| plasma_vault | BalanceAssetsValidation, RedeemFromRequest, RequestShares | Vault operations |
| burn_request_fee | BurnRequestFee | Fee handling |
| configure_instant_withdrawal | ConfigureInstantWithdrawal | Withdrawal config |

## Naming Conventions

### Solidity Files
- Pattern: `[Protocol][Action]Fuse.sol`
- Examples: `AaveV3SupplyFuse.sol`, `UniswapV3SwapFuse.sol`

### TypeScript ABI Files
- Pattern: `[protocol]-[action]-fuse.abi.ts` (kebab-case)
- Examples: `aave-v3-supply-fuse.abi.ts`, `uniswap-v3-swap-fuse.abi.ts`

### Export Names
- Pattern: `[protocol][Action]FuseAbi` (camelCase + "Abi")
- Examples: `aaveV3SupplyFuseAbi`, `uniswapV3SwapFuseAbi`

## Core Interfaces

```solidity
// All fuses implement IFuse
interface IFuse is IFuseCommon {
    function enter(bytes calldata data_) external;
    function exit(bytes calldata data_) external;
}

// Common to all fuses
interface IFuseCommon {
    function MARKET_ID() external view returns (uint256);
}

// Balance tracking fuses
interface IMarketBalanceFuse {
    function balanceOf() external returns (uint256); // USD value, 18 decimals
}
```

## Fuse Types

1. **Balance Fuses** - Read-only, track USD value of positions
2. **Supply Fuses** - Deposit/withdraw liquidity
3. **Borrow Fuses** - Borrow/repay in lending protocols
4. **Collateral Fuses** - Manage collateral positions
5. **Swap Fuses** - Token exchanges
6. **Position Fuses** - Create/modify/collect LP positions
7. **Gauge Fuses** - Stake in liquidity gauges
8. **Special Fuses** - Async operations, flash loans, etc.

## Common Tasks

### Find all fuses for a protocol
```bash
ls external/wgenie-fusion/contracts/fuses/[protocol]/
```

### Find a fuse by name
```bash
find external/wgenie-fusion/contracts/fuses -name "*[Name]*Fuse.sol"
```

### List all generated ABIs
```bash
ls packages/ponder/abis/fuses/
```

### Read protocol documentation
```bash
cat external/wgenie-fusion/contracts/fuses/[protocol]/README.md
```

### Search for fuse usage in tests
```bash
grep -r "[FuseName]" external/wgenie-fusion/test/
```

## Protocol Documentation Available

READMEs exist for these protocols:
- aave_v2, aave_v3
- async_action
- balancer
- ebisu
- enso
- liquity
- stake_dao_v2
- yield_basis
