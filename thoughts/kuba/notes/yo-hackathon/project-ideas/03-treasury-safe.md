# Idea 3: YO Treasury — Multi-Sig Savings for DAOs & Teams

## Winning Potential: MEDIUM-HIGH

## The Problem

DAOs and crypto teams hold millions in idle treasury funds — usually USDC, ETH, or stablecoins sitting in Safe multisigs earning 0%. Getting a DAO to deploy treasury into yield requires:
1. Someone to research options (time-consuming)
2. A proposal and vote (governance overhead)
3. Technical execution by a signer (scary for non-technical signers)
4. Ongoing monitoring (who watches the yield?)

YO's "set and forget" vault model is perfect for treasury use, but the current app.yo.xyz UI is designed for individual EOA wallets, not Safe multisigs.

## The Solution

A treasury management interface purpose-built for Safe multisig wallets. It shows idle vs deployed balances, recommends YO vault allocations, and generates Safe-compatible transaction batches using `prepareDeposit` / `prepareRedeem` from the SDK. No private keys needed — just calldata ready for Safe signing.

## User Segment

- DAO treasurers managing idle funds in Safe multisigs
- Crypto startups with treasury in 3/5 or 4/7 Safe wallets
- Protocol teams looking for low-risk yield on operational reserves

## Key Features

### 1. Safe Wallet Overview
- Connect Safe address (read-only — no signing needed for viewing)
- Show all token balances: idle USDC, ETH, WBTC, etc.
- Calculate "opportunity cost" — how much yield you're missing by not deploying

### 2. Deployment Recommendations
- "You have $2.3M idle USDC → yoUSD at 19.48% → $448K/year in yield"
- "You have 500 idle ETH → yoETH at 17.79% → 89 ETH/year in yield"
- Show risk breakdown for each recommended vault

### 3. Transaction Builder
- Use `client.prepareDeposit()` and `client.prepareApprove()` to generate raw calldata
- Output as Safe-compatible transaction batch (JSON format for Safe Transaction Builder)
- No private keys — signers approve in Safe UI
- Support for partial allocation ("deploy 80%, keep 20% liquid")

### 4. Position Monitoring Dashboard
- Track deployed positions across all YO vaults
- Show yield earned, share price changes, pending redemptions
- Alert when instant redemption liquidity is low

### 5. Withdrawal Queue Management
- Show pending async redemptions with estimated fulfillment time
- Batch redeem across multiple vaults

## Why This Wins

| Criterion | Score | Reasoning |
|---|---|---|
| UX Simplicity (30%) | MEDIUM | Treasury management is inherently more complex, but the "opportunity cost" framing is compelling. |
| Creativity (30%) | HIGH | No one is building treasury-specific YO interfaces. It's a well-defined niche. |
| Integration (20%) | VERY HIGH | Uses prepareDeposit/prepareRedeem (the AA/Safe pattern), getAllowance, getUserPosition — deep SDK usage. |
| Risk & Trust (20%) | VERY HIGH | Safe multisig = maximum trust. Read-only viewing + signed-by-committee execution. Shows risk metrics prominently. |

## Technical Architecture

### Core: `@yo-protocol/core` in prepare mode
```typescript
const client = createYoClient({ chainId: 8453 })

// Generate calldata without wallet
const approveTx = client.prepareApprove(usdcAddress, amount)
const depositTx = await client.prepareDeposit({ vault: yoUSD, amount, recipient: safeAddress })

// Format for Safe Transaction Builder
const safeBatch = formatForSafe([approveTx, depositTx])
```

### Frontend
- Next.js with read-only Safe integration (Safe SDK or direct contract reads)
- Token balance display from multicall
- Yield projection calculator
- Transaction batch export (JSON for Safe Transaction Builder import)

### Safe Integration
- Read Safe balances via public RPC multicall
- Use `yo prepare` CLI or `prepareDeposit` SDK for calldata generation
- Export as Safe Transaction Builder compatible JSON

## Effort Estimate

- 50% reuse from wGenie monorepo (RPC infrastructure, vault metrics components, wagmi)
- New work: Safe balance reader, calldata formatter, opportunity cost calculator, 8-10 UI components
- Can be built in 3-4 days

## Demo Script (3 minutes)

1. (0:00-0:30) Enter a Safe address. Show idle treasury: $2.3M USDC, 500 ETH, 100 cbBTC.
2. (0:30-1:00) "You're missing $448K/year in yield." Show recommended YO vault allocations.
3. (1:00-1:30) Click "Deploy 80% USDC to yoUSD." Generate Safe transaction batch.
4. (1:30-2:00) Import batch into Safe Transaction Builder. Show the signing flow.
5. (2:00-2:30) After execution, show the monitoring dashboard — deployed positions, yield accruing.
6. (2:30-3:00) "Withdraw $500K for operational expenses." Generate redeem batch. Close with thesis.

## Differentiator

Targets a specific, underserved user segment (DAO treasuries) with a specific, painful problem (idle capital). The Safe integration pattern using `prepareDeposit` demonstrates sophisticated SDK usage. Most submissions will build for individual users — this stands out by solving for institutional capital.
