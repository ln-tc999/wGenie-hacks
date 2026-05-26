# Idea 2: YO Goals — Goal-Based DeFi Savings

## Winning Potential: HIGH

## The Problem

DeFi yield products are presented as financial instruments — APY percentages, share prices, TVL charts. Real people don't think this way. They think: "I need $5,000 for a vacation in June" or "I want to save $20,000 for a down payment in 2 years." There's a massive gap between how DeFi presents yield and how humans think about savings.

Traditional fintech (Acorns, Digit, YNAB) solved this with **goal-based saving** — you set a target amount and deadline, the app tracks your progress. Nobody has brought this mental model to DeFi.

## The Solution

A goal-based savings app built on YO vaults. Users create named savings goals with target amounts and deadlines. The app recommends the optimal YO vault based on the goal's asset type and timeline, auto-calculates how much yield will help reach the target, and provides a beautiful progress dashboard.

## User Segment

- Crypto-native savers who hold stablecoins but lack savings discipline
- People who understand "save for X" but not "deposit into ERC-4626 vault"
- Young adults who are comfortable with crypto but want a fintech-like saving experience

## Key Features

### 1. Goal Creation
- Name your goal ("Europe Trip", "Emergency Fund", "New Car")
- Set target amount (e.g., $5,000)
- Set deadline (e.g., June 2026)
- Choose asset type (USD, ETH, BTC, EUR)
- App recommends the matching YO vault (yoUSD for USD goals, yoETH for ETH goals, etc.)

### 2. Smart Deposit Suggestions
- "To reach $5,000 by June at current 19.48% APY, deposit $4,200 now — yield covers the rest"
- "Or deposit $1,000/month for 5 months"
- Shows how yield accelerates savings vs just holding

### 3. Progress Dashboard
- Visual progress bar per goal (current value vs target)
- Yield earned so far (highlighted to show "free money")
- Projected completion date at current rates
- "On Track" / "Behind" / "Ahead" status indicators

### 4. Real Deposit/Redeem Flows
- One-click deposit into the goal's assigned vault
- Partial redeem when a goal is reached
- All via `@yo-protocol/core` SDK with real on-chain transactions

### 5. Goal Completion Celebration
- When a goal is reached, confetti animation + "Goal Complete!" card
- Option to redeem or roll into a new goal

## Why This Wins

| Criterion | Score | Reasoning |
|---|---|---|
| UX Simplicity (30%) | VERY HIGH | Goal = amount + deadline. That's it. No DeFi jargon. |
| Creativity (30%) | HIGH | Nobody has done goal-based savings in DeFi. It's a proven fintech pattern applied to a new domain. |
| Integration (20%) | HIGH | Full deposit/redeem via SDK. Uses getVaultSnapshot for APY, getUserPosition for tracking. |
| Risk & Trust (20%) | MEDIUM-HIGH | Clear display of "your money is in yoUSD earning 19.48%". Shows vault allocation. But less emphasis on risk than Idea 1. |

## Technical Architecture

### Data Model (Local Storage / Supabase)
```typescript
interface SavingsGoal {
  id: string
  name: string
  emoji: string // 🏖️ 🚗 🏠 💰
  targetAmount: bigint
  targetDate: Date
  vaultAddress: string
  chainId: number
  asset: 'USDC' | 'WETH' | 'cbBTC' | 'EURC'
  deposits: { hash: string; amount: bigint; date: Date }[]
  createdAt: Date
}
```

### Frontend
- Next.js app with `@yo-protocol/react` hooks
- `useVault('yoUSD')` for APY data
- `useDeposit({ vault })` for deposit flow
- `useRedeem({ vault })` for withdrawal
- `useUserBalance(vault)` for tracking progress
- Tailwind + shadcn/ui for clean fintech-like design
- Goal cards with progress rings (like fitness apps)

### Yield Projection Calculator
```typescript
function projectGoalCompletion(
  currentBalance: bigint,
  targetAmount: bigint,
  apy: number,
  targetDate: Date
): { onTrack: boolean; projectedDate: Date; shortfall: bigint }
```

## Effort Estimate

- 40% reuse from wGenie monorepo (wagmi config, UI primitives, RPC infrastructure)
- New work: Goal CRUD, progress calculations, projection math, 6-8 UI components
- Can be built in 3-4 days

## Demo Script (3 minutes)

1. (0:00-0:30) "I'm saving for a trip to Europe." Create goal: $5,000, August 2026, USD.
2. (0:30-1:00) App recommends yoUSD at 19.48% APY. Shows: "Deposit $4,200 now and yield covers the rest."
3. (1:00-1:30) Deposit $100 USDC (demo amount). Real on-chain tx. Goal card updates with progress.
4. (1:30-2:00) Show dashboard with multiple goals. Each shows progress bar, yield earned, projected date.
5. (2:00-2:30) "My emergency fund goal is complete!" Show redeem flow — instant withdrawal.
6. (2:30-3:00) Close with the thesis: DeFi should feel like a savings app, not a trading terminal.

## Differentiator

Reframes DeFi yield from a financial product into a **personal savings tool**. The competition will build dashboards and deposit forms. We're building a savings experience that your non-crypto friends would understand.
