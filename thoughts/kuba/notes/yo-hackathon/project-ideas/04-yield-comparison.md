# Idea 4: YO vs Everything — Yield Comparison & Savings Calculator

## Winning Potential: MEDIUM

## The Problem

When someone considers putting money into a YO vault, their first question is: "Is this better than what I already have?" Comparing DeFi yields is painful — every protocol has different UIs, different APY calculations, different risk profiles. And comparing to traditional savings (banks, money markets, treasuries) is even harder.

YO's existing app has a "Compare to" feature on the Performance tab, but it only shows historical charts against specific protocols. There's no forward-looking comparison or traditional finance benchmarking.

## The Solution

A yield comparison tool that shows YO vaults alongside traditional and DeFi alternatives. Users input an amount, see projected earnings across options (YO vs Aave vs bank savings vs T-bills), and deposit into YO with one click when convinced.

## User Segment

- Crypto holders evaluating where to park capital
- TradFi users considering DeFi for the first time (need the bank comparison)
- Yield farmers comparing protocols

## Key Features

### 1. Side-by-Side Comparison Table
| Option | APY | Risk Level | Liquidity | Your $10K Earns |
|---|---|---|---|---|
| yoUSD (YO) | 19.48% | Low-Med | 24h max | $1,948/yr |
| Aave V3 USDC | 4.2% | Low | Instant | $420/yr |
| Chase Savings | 0.01% | Very Low | Instant | $1/yr |
| 3-Month T-Bill | 4.8% | Very Low | 3 months | $480/yr |
| Ethena sUSDe | 12.5% | Medium | 7 days | $1,250/yr |

### 2. Earnings Calculator
- Input: amount, time period
- Output: projected earnings for each option with visual bar chart
- Highlight the YO advantage in dollar terms

### 3. Risk Breakdown
- For YO vaults: show the 52 yield sources, allocation %, risk ratings from Exponential.fi
- For alternatives: standardized risk indicators
- Smart contract risk, protocol risk, bridge risk explained in plain English

### 4. One-Click Deposit
- "Convinced? Deposit now" button → full YO SDK deposit flow
- Smooth transition from comparison to action

### 5. Historical Performance
- Use `getVaultYieldHistory` and `getVaultTvlHistory` from YO API
- Show actual realized yields over 7D, 30D, 90D periods
- Compare against benchmark returns over same periods

## Why This Wins

| Criterion | Score | Reasoning |
|---|---|---|
| UX Simplicity (30%) | HIGH | Calculator + comparison table is universally understood. |
| Creativity (30%) | MEDIUM | Comparison tools exist in TradFi (Bankrate, NerdWallet). Novel for DeFi-to-TradFi comparison. |
| Integration (20%) | MEDIUM-HIGH | Uses getVaultSnapshot, getVaultYieldHistory, deposit flow. Less complex than Ideas 1-3. |
| Risk & Trust (20%) | HIGH | Explicit risk comparison builds trust. Users see exactly what they're choosing. |

## Technical Architecture

### Data Sources
- YO vaults: `@yo-protocol/core` SDK — `getVaultSnapshot`, `getVaultYieldHistory`
- DeFi alternatives: DeFiLlama API (free, public) for Aave, Compound, Ethena rates
- TradFi: Hardcoded or scraped from FRED API (T-bill rates), bank rate APIs

### Frontend
- Next.js with `@yo-protocol/react` for deposit flow
- Recharts for visual comparisons
- Responsive design optimized for sharing (people will screenshot comparisons)

## Effort Estimate

- 30% reuse from wGenie monorepo (wagmi, chart components, UI primitives)
- New work: Comparison engine, external data fetching, calculator logic, 8-10 UI components
- Can be built in 2-3 days

## Demo Script (3 minutes)

1. (0:00-0:30) "I have $10,000 in USDC. Where should I put it?" Enter amount.
2. (0:30-1:15) Comparison table loads: yoUSD vs Aave vs bank vs T-bills. YO clearly wins.
3. (1:15-1:45) "That's $1,948/year vs $420 on Aave." Show bar chart visualization.
4. (1:45-2:15) Click on yoUSD risk breakdown. Show 52 yield sources, allocation pie, risk ratings.
5. (2:15-2:45) "Deposit into yoUSD." Execute real deposit with wallet signing.
6. (2:45-3:00) "Now I can see my position and track performance over time."

## Differentiator

The "Bankrate for DeFi" concept. It answers the most fundamental user question — "is this better than my alternatives?" — before asking for a deposit. The TradFi comparison is what makes it accessible to new users.

## Weakness

Less creative than Ideas 1-3. Comparison tools are a known pattern. The execution quality and data quality would need to be exceptional to stand out.
