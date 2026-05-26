# Idea 1: YO Savings Copilot — AI-Powered Savings Agent

## Winning Potential: HIGHEST

## The Problem

DeFi yield is confusing. Regular users don't understand vaults, share prices, ERC-4626, or cross-chain rebalancing. They just want to save money and earn interest — like a bank savings account, but better. The gap between "DeFi yield exists" and "a normal person trusts it with their money" is entirely a UX problem.

## The Solution

A conversational AI agent that acts as your personal savings advisor. Users chat naturally — "I have 5000 USDC, where should I put it?" — and the agent explains options, shows risks, simulates outcomes, and executes real deposits/redeems through the YO SDK. Think: **a financial advisor in your pocket that actually executes transactions**.

## User Segment

- Crypto-curious users who hold stablecoins on exchanges or wallets but don't know how to earn yield
- Existing DeFi users who want a faster, more intuitive way to manage YO positions
- DAO treasurers who want plain-English analysis before committing funds

## Key Features

### 1. Conversational Vault Discovery
User: "What can I earn on my ETH?"
Agent: Checks yoETH on Base — 17.79% APY across 30 yield sources. Shows allocation breakdown, risk rating, and instant redemption availability.

### 2. Yield Simulation Before Deposit
User: "What would 10 ETH earn me in 3 months?"
Agent: Calculates projected yield at current rates, shows historical performance, compares to holding ETH on Aave V3 (their "Compare to" benchmark).

### 3. One-Chat Deposits
User: "Deposit 2 ETH into yoETH"
Agent: Prepares approve + deposit transactions via `@yo-protocol/core`, shows slippage estimate, previews shares received, then the UI renders a transaction signing flow.

### 4. Portfolio Overview
User: "How are my savings doing?"
Agent: Reads all YO vault positions for the connected wallet, shows total value in USD, unrealized yield earned, pending redemptions.

### 5. Risk Transparency
User: "Is yoUSD safe?"
Agent: Breaks down the 52 yield sources, explains that capital is spread across Morpho, Pendle, Aave etc., mentions the oracle circuit breaker, max 24h withdrawal window, and that user funds never cross bridges.

### 6. Smart Redemptions
User: "I need my money back"
Agent: Checks available instant redemption liquidity. If sufficient, executes immediately. If not, explains the async queue and estimated wait time.

## Why This Wins

| Criterion | Score | Reasoning |
|---|---|---|
| UX Simplicity (30%) | HIGH | Conversation is the most natural UX. No forms, no tabs, no settings. |
| Creativity (30%) | HIGH | "AI-powered yield agent" is listed as an example but nobody has done it well with real transactions. We have a production-quality agent pipeline. |
| Integration (20%) | HIGH | Full SDK usage: deposit, redeem, getVaultState, getVaultSnapshot, getUserPosition, all live on-chain. |
| Risk & Trust (20%) | HIGH | Agent explains risks before every action. Simulation shows expected outcome. No hidden operations. |

## Technical Architecture

### Backend: Mastra Agent
- New agent: `yo-savings-agent.ts` based on Alpha Agent pattern
- Tools using `@yo-protocol/core`:
  - `getYoVaults` — list available vaults with APY/TVL from API
  - `getYoVaultDetails` — deep dive on a specific vault (allocation, risk, yield sources)
  - `getUserYoPosition` — read wallet's positions across all vaults
  - `simulateYoDeposit` — preview deposit with slippage calculation
  - `executeYoDeposit` — prepare approve + deposit calldata
  - `executeYoRedeem` — prepare redeem calldata, handle instant vs async
  - `getYoYieldHistory` — historical yield data for projections
- Working memory for conversation context (thread per wallet)

### Frontend: Next.js Chat UI
- Clone `vault-alpha.tsx` pattern with YO-specific branding
- New tool renderer components:
  - `YoVaultCard` — shows vault APY, TVL, risk rating, allocation pie chart
  - `YoDepositPreview` — shows expected shares, slippage, projected yield
  - `YoPositionSummary` — portfolio view across all vaults
  - `YoTransactionFlow` — approve → deposit/redeem execution
- Wagmi wallet integration (already configured for Base, Ethereum, Arbitrum)

### API Route
- `POST /api/yo/chat` — streams agent responses
- Passes `callerAddress` from connected wallet

## Effort Estimate

- 70% of infrastructure already exists in the wGenie monorepo
- New work: ~5 agent tools, ~5 UI components, 1 API route, branding/styling
- Can be built in 2-3 days of focused work

## Demo Script (3 minutes)

1. (0:00-0:30) Open app, connect wallet. "I've been hearing about DeFi savings. What are my options?"
2. (0:30-1:00) Agent explains yoUSD (19.48% APY) and yoETH (17.79%). Shows allocation breakdowns.
3. (1:00-1:30) "Deposit 100 USDC into yoUSD." Agent previews shares, user signs tx. Show on-chain confirmation.
4. (1:30-2:00) "How much will I earn in a month?" Agent calculates projection. "What risks should I know about?" Agent explains.
5. (2:00-2:30) "Now withdraw half." Agent checks instant liquidity, executes redeem.
6. (2:30-3:00) "Show me my savings summary." Agent shows portfolio across vaults. Close with UX thesis.

## Differentiator

Most hackathon submissions will build a static dashboard or a deposit form. We're building an **intelligent agent** that understands yield, explains risks, and executes transactions — all through conversation. The UX is zero learning curve because it's just talking.
