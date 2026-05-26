# YO Treasury — AI-Managed Yield Vault for YO Protocol

## Vision

**One vault for all your YO positions, securely managed by an AI agent.**

DeFi yield is powerful but fragmented. A user wanting exposure to yoUSD, yoETH, yoBTC, and yoEUR today must execute separate deposit transactions for each vault, manually swap between assets, monitor four different positions, and sign dozens of approvals. For treasuries and power users managing meaningful capital across multiple YO vaults, this friction compounds into a real barrier.

YO Treasury solves this by creating a personal on-chain vault that wraps all YO vaults into a single position. Users deposit once (USDC), and an AI copilot handles the rest — allocating across YO vaults, swapping between assets, and rebalancing — all executed as atomic batch transactions with a single wallet signature. The user's dashboard always shows exactly where their funds are, how much yield they're earning, and the full state of their portfolio.

---

## How It Works

YO Treasury is built on wGenie Fusion — a modular smart contract framework for composable vault strategies. Each user deploys their own **PlasmaVault** (an ERC-4626 vault) on Base, configured with specialized action modules called **fuses** that connect to YO Protocol vaults.

### The Architecture

```
User deposits USDC into their PlasmaVault
         │
         ▼
┌─────────────────────────────────────────────┐
│           User's PlasmaVault (ERC-4626)     │
│                                             │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  │
│  │ Supply  │  │ Redeem  │  │   Swap     │  │
│  │ Fuses   │  │ Fuses   │  │   Fuse     │  │
│  │ (4x)    │  │ (4x)    │  │   (1x)     │  │
│  └────┬────┘  └────┬────┘  └─────┬──────┘  │
│       │            │             │          │
│  ┌────▼────────────▼─────────────▼──────┐   │
│  │     Whitelisted Markets & Assets     │   │
│  └────┬─────┬──────┬──────┬─────────────┘   │
└───────┼─────┼──────┼──────┼─────────────────┘
        │     │      │      │
        ▼     ▼      ▼      ▼
     yoUSD  yoETH  yoBTC  yoEUR
     (USDC) (WETH) (cbBTC)(EURC)
```

The AI agent translates natural language into transaction calldata. It never touches private keys — it only produces the data. The user with the Alpha role reviews the proposal (complete with a fork simulation showing before/after balances) and executes with their own wallet.

---

## Key Features

### One-Sign Batch Rebalancing

Traditional DeFi rebalancing requires a chain of individual transactions: withdraw from vault A, approve token B, swap on DEX, approve vault C, deposit into vault C. Each step requires a separate wallet signature and gas payment.

YO Treasury compresses this entire sequence into a **single atomic transaction**. The PlasmaVault's `execute()` function accepts an array of fuse actions that run sequentially in one call. A complex operation like "withdraw from yoUSD, swap USDC to WETH, deposit into yoETH" becomes one transaction, one signature, one gas payment — and it either all succeeds or all reverts.

### AI Agent Copilot

The Mastra-powered AI agent serves as the strategy execution layer. Users interact through natural conversation:

- *"What yields can I earn?"* → Agent queries live YO vault APRs and TVL
- *"Allocate 500 USDC to yoUSD"* → Agent builds deposit calldata via ERC4626SupplyFuse
- *"Swap 200 USDC to WETH and put it in yoETH"* → Agent chains a DEX swap (via Odos) with a vault deposit — two fuse actions batched into one transaction
- *"Withdraw everything from yoBTC"* → Agent builds redeem calldata via YoRedeemFuse

The agent uses deterministic, code-based tools — not LLM-generated code. Each tool encodes calldata from verified ABIs with hardcoded fuse addresses. The LLM decides *what* to do; the tools ensure *how* it's done is always correct.

### Fork Simulation Before Every Execution

Before any transaction proposal is shown to the user, the agent runs a simulation on a Tenderly Virtual TestNet — a persistent, serverless fork of the live blockchain. It takes an EVM snapshot, executes the full batch of fuse actions, reads balances before and after, and reverts the snapshot. The user sees exactly which token balances will change and by how much — before signing anything. Unlike local Anvil forks, Tenderly runs serverlessly — no process management, no port allocation, and compatible with serverless deployments (Vercel, etc.).

### Role-Based Security Model

The PlasmaVault uses an on-chain AccessManager with separated roles:

| Role | Who | What They Can Do |
|------|-----|-----------------|
| **Atomist** | Vault owner | Configure strategy — which fuses are installed, which markets and assets are whitelisted |
| **Alpha** | Vault owner (or delegate) | Execute transactions — but only through whitelisted fuses to whitelisted markets |
| **Whitelist** | Approved depositors | Deposit and withdraw from the vault |

This separation means:
- The **AI agent never has access to private keys** — it only produces calldata
- The **Alpha can only perform whitelisted actions** — even a compromised Alpha role cannot move funds to arbitrary addresses
- The **Atomist controls the strategy** — they decide which YO vaults, which swap routers, and which tokens are permitted
- **Anyone can run the agent** to produce transaction proposals, but only the Alpha can execute them

### Modular Fuse System

Fuses are plug-and-play action modules. The vault owner (Atomist) can:
- **Add new market connections** — when YO launches new vaults (yoGOLD, yoUSDT), just install the corresponding fuse
- **Remove permissions** — disable a market by removing its fuse
- **Configure substrates** — whitelist specific assets and DEX routers per market

Each fuse type serves a specific purpose:
- **ERC4626SupplyFuse** (4 instances) — deposit underlying tokens into YO vaults
- **YoRedeemFuse** (4 instances) — withdraw from YO vaults via `redeem()` (custom-built because YO vaults disable the standard `withdraw()` function)
- **UniversalTokenSwapperFuse** (1 instance) — swap between any whitelisted tokens via DEX aggregators (Odos, KyberSwap, Uniswap V3)
- **ERC4626BalanceFuse** (4 instances) — read-only reporting of position values for portfolio tracking

### Dashboard-First Transparency

The primary user interface is a **portfolio dashboard** — not the AI chat. Users always see:
- **Total portfolio value** in USD
- **Allocated vs. unallocated** capital breakdown
- **Per-vault positions** with live APR, TVL, and yield data from the YO Protocol API
- **Active/inactive status** for each YO vault allocation

The AI chat is a secondary interface for executing alpha actions. This design builds trust — users feel safe because they always see their positions without needing to interact with AI.

### Vault Creation Wizard

Users can deploy their own Treasury vault directly from the web UI through a guided 6-step wizard:

1. **Clone Vault** — Deploy a new PlasmaVault from the Fusion Factory
2. **Grant Roles** — Set up Atomist, Alpha, Fuse Manager, and Whitelist roles
3. **Install Fuses** — Add all 9 fuse contracts (4 supply + 4 redeem + 1 swap)
4. **Add Balance Fuses** — Link balance reporting to each market
5. **Configure Substrates** — Whitelist YO vault addresses and swap router addresses
6. **Update Dependencies** — Set balance calculation graph

17 total transactions, each shown as a step with progress indicators. The wizard reads on-chain state and skips already-completed steps, so users can safely resume if interrupted.

---

## YO SDK Integration

YO Treasury integrates both `@yo-protocol/core` and `@yo-protocol/react` throughout the application:

### `@yo-protocol/react` — User-Facing Vault Interactions

For individual YO vault pages, the React SDK provides the complete deposit/redeem experience:

- **`YieldProvider`** — Wraps all YO vault UI components with partner context and slippage configuration
- **`useVaultState`** — Reads vault asset address, decimals, symbol, and name for form display
- **`useTokenBalance`** — Shows user's wallet balance of the deposit token
- **`useUserPosition`** — Displays current position value in the vault
- **`usePreviewDeposit`** — Shows estimated shares the user will receive before confirming
- **`useDeposit`** — Handles the full deposit flow including chain switching, approval, and transaction confirmation with step-by-step progress
- **`useRedeem`** — Handles withdrawal with support for both instant and queued (async) redemptions
- **`useShareBalance`** — Reads share balance for max withdrawal calculations
- **`usePendingRedemptions`** — Shows pending async redemption status with a warning banner

### `@yo-protocol/core` — Data Layer & API

The core SDK provides the data backbone for the treasury dashboard:

- **`createYoClient().getVaults()`** — Fetches live APR (7-day yield), TVL, and share price for all YO vaults. Used in the AllocationTable to show each vault's performance alongside on-chain position data
- **`createYoClient().getPrices()`** — Token price feeds used for USD value calculations and as a fallback price oracle
- **`getVaultSnapshot()`** — Detailed point-in-time vault metrics for individual vault detail pages
- **`getVaultYieldHistory()`** / **`getVaultTvlHistory()`** / **`getSharePriceHistory()`** — Historical time-series data powering interactive charts (yield trends, TVL growth, share price evolution)
- **`getVaultPerformance()`** — Unrealized return calculations for the user's position

### Integration Architecture

The YO SDK serves two distinct integration points:

1. **Direct YO vault interactions** (deposit/redeem into yoUSD, yoETH, etc.) use `@yo-protocol/react` hooks — the official way to interact with YO vaults from a React frontend
2. **Treasury-level operations** (the PlasmaVault managing positions across YO vaults) use `@wgenie/fusion-sdk` for on-chain reads and fuse calldata encoding, combined with `@yo-protocol/core` for off-chain metrics (APR, TVL, historical data)

This dual integration demonstrates the composability of the YO Protocol — YO vaults work both as standalone products and as building blocks inside larger vault architectures.

---

## Risk & Transparency

### User Owns Everything

The vault is not custodial. The user who creates a Treasury vault holds all management roles (Owner, Atomist, Alpha, Fuse Manager, Whitelist). No external party can execute transactions, change configuration, or access funds.

### Whitelisted Actions Only

The Alpha role (transaction executor) is constrained by the fuse whitelist. Even if someone gains Alpha access, they can only:
- Deposit into the 4 whitelisted YO vaults
- Withdraw from those same 4 vaults
- Swap between whitelisted tokens (USDC, WETH, cbBTC, EURC) via whitelisted DEX routers (Odos, KyberSwap, Uniswap)

No arbitrary contract calls. No token transfers to external addresses. The vault's `execute()` function rejects any fuse action that isn't on the whitelist.

### Simulation Before Signing

Every transaction proposal includes a Tenderly fork simulation result showing exact balance changes. Users see which tokens increase, which decrease, and the USD impact — before they sign. Failed simulations are flagged and blocked from execution.

### On-Chain Verifiability

All vault state is on-chain and queryable:
- Positions: `balanceOf()` + `convertToAssets()` on each YO vault
- Role assignments: `AccessManager.hasRole()`
- Installed fuses: `PlasmaVault.getFuses()`
- Whitelisted assets: `PlasmaVault.getMarketSubstrates()`

The dashboard reads all data directly from the blockchain via wagmi multicalls — no off-chain database for position tracking.

### ERC-4626 Standard Compliance

Both the Treasury PlasmaVault and the underlying YO vaults implement the ERC-4626 tokenized vault standard. This means:
- Standard `deposit()`/`redeem()` interfaces
- Transparent share-to-asset conversion via `convertToAssets()`/`convertToShares()`
- Compatible with any ERC-4626-aware tooling and integrations

---

## Custom Smart Contracts

### YoRedeemFuse

During development, we discovered that YO vaults disable the standard ERC-4626 `withdraw()` function (it reverts with `UseRequestRedeem()`). The existing `Erc4626SupplyFuse.exit()` calls `withdraw()`, making it incompatible with YO vaults.

We solved this by writing and deploying a custom **YoRedeemFuse** — a Solidity fuse contract that calls `redeem()` instead of `withdraw()`. Four instances were deployed to Base mainnet (one per YO vault market slot):

| Slot | YO Vault | YoRedeemFuse Address |
|------|----------|---------------------|
| 1 | yoUSD | `0x6f7248f6d057e5f775a2608a71e1b0050b1adb95` |
| 2 | yoETH | `0xaebd1bab51368b0382a3f963468cab3edc524e5d` |
| 3 | yoBTC | `0x5760089c08a2b805760f0f86e867bffa9543aa41` |
| 4 | yoEUR | `0x7CB5E0e8083392EdEB4AaF68838215A3dD1831e5` |

The fuse runs via `delegatecall` from the PlasmaVault, so `address(this)` equals the PlasmaVault address — which is the share owner — satisfying YO's `msg.sender == owner` requirement for redemptions.

### Development Approach

The project started with a POC using Hardhat fork tests against Base mainnet. All on-chain flows (vault creation, role grants, fuse installation, deposits, swaps, withdrawals) were validated on a forked chain before any frontend work began. This ensured the smart contract architecture was sound before building the UI layer.

Early agent development used local Anvil forks (spawned per-request) for transaction simulation. This was later migrated to **Tenderly Virtual TestNets** — persistent, serverless forks that support snapshot/revert semantics. This change eliminated the need for local process management and made the simulation pipeline compatible with serverless deployments (Vercel, etc.).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React, Tailwind CSS, shadcn/ui |
| **Wallet** | wagmi, viem (injected wallets — MetaMask, Rabby, etc.) |
| **On-chain reads** | wagmi `useReadContracts` (multicall batching) |
| **YO SDK** | `@yo-protocol/core` (vault data, API), `@yo-protocol/react` (deposit/redeem hooks) |
| **Vault SDK** | `@wgenie/fusion-sdk` (PlasmaVault interactions, fuse encoding) |
| **AI Agent** | Mastra framework, Claude Haiku 4.5 (via OpenRouter) |
| **DEX Aggregation** | Odos API (quote + assemble) |
| **Simulation** | Tenderly Virtual TestNet (persistent fork with snapshot/revert) |
| **Blockchain** | Base (primary), with support for Ethereum and Arbitrum |
| **Indexing** | Ponder (blockchain event indexer) → Supabase |
| **Charts** | Recharts (yield history, TVL, share price) |

---

## User Stories

### 1. Create a Treasury Vault
A user navigates to the vault creation page and deploys their own PlasmaVault through a 6-step guided wizard. After 17 transactions, they have a fully configured vault with all roles, fuses, and market configurations ready. The wizard persists progress in localStorage and can be resumed if interrupted.

### 2. Deposit USDC
From the web UI, a user enters a USDC amount and clicks Deposit. If needed, an ERC-20 approval transaction fires first. The USDC moves from their wallet into their PlasmaVault. The dashboard immediately reflects the updated unallocated balance.

### 3. Allocate to YO Vaults via AI Agent
The user opens the chat panel and says *"Put 500 USDC into yoUSD."* The agent:
1. Reads current treasury balances
2. Encodes an `Erc4626SupplyFuse.enter()` call
3. Simulates on a Tenderly fork — shows before/after balances
4. Presents a transaction proposal card in the chat
5. User clicks Execute — single transaction, single signature
6. Dashboard updates to show the new yoUSD position earning yield

### 4. Cross-Asset Allocation (Swap + Deposit)
The user says *"Swap 200 USDC to WETH and allocate to yoETH."* The agent:
1. Fetches an Odos DEX quote for USDC→WETH
2. Encodes a `UniversalTokenSwapperFuse.enter()` call (approve + swap)
3. Encodes an `Erc4626SupplyFuse.enter()` call for yoETH
4. Batches both fuse actions into one proposal
5. Simulates the full batch on Tenderly — one fork snapshot, both actions executed atomically
6. User signs once — swap and deposit happen in a single transaction

### 5. Monitor Portfolio Performance
The dashboard shows live data without any AI interaction:
- Total portfolio value with USD conversion
- Per-vault allocation with 7-day APR from YO Protocol API
- TVL and share price for each YO vault
- Active/inactive status badges
- Yield history, TVL trends, and share price charts on vault detail pages

### 6. Withdraw from Treasury
The user uses the web UI withdraw form to redeem shares from their PlasmaVault, receiving USDC back to their wallet. For partial withdrawals, shares are calculated proportionally. For max withdrawals, the exact share balance is used to avoid rounding dust.

---

## Live Demo Vault (Base Mainnet)

A fully configured and funded Treasury vault is deployed on Base:

- **Vault Address**: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`
- **Chain**: Base (8453)
- **All 4 YO vaults allocated**: yoUSD, yoETH, yoBTC, yoEUR — all actively earning yield
- **17 setup transactions completed**: clone, roles, fuses, balance fuses, substrates, dependency graphs
- **Real on-chain transactions**: deposits, swaps (via Odos), allocations, and withdrawals all executed and verified on Base mainnet
