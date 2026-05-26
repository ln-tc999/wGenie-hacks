# YO Hackathon Project Ideas — Ranked

## Recommendation: Idea 1 (AI Savings Copilot)

Our strongest competitive advantage is the **existing AI agent-to-transaction pipeline** from the wGenie monorepo. No other hackathon participant will have a production-grade chat → tool execution → simulation → on-chain signing flow ready to adapt. This is our moat.

## Rankings

| Rank | Idea | Win Probability | Build Effort | Our Edge |
|------|------|----------------|-------------|----------|
| 1 | **AI Savings Copilot** | HIGHEST | 2-3 days | 70% existing infra, unique AI angle |
| 2 | **Savings Goals** | HIGH | 3-4 days | Strong UX story, fintech pattern in DeFi |
| 3 | **Treasury Safe** | MEDIUM-HIGH | 3-4 days | Niche targeting, deep SDK usage |
| 4 | **Yield Comparison** | MEDIUM | 2-3 days | Quick to build but less differentiated |

## Scoring Matrix

| Criterion (Weight) | AI Copilot | Goals | Treasury | Comparison |
|---|---|---|---|---|
| UX Simplicity (30%) | 9/10 | 9/10 | 6/10 | 8/10 |
| Creativity (30%) | 9/10 | 8/10 | 7/10 | 5/10 |
| Integration (20%) | 9/10 | 8/10 | 9/10 | 7/10 |
| Risk & Trust (20%) | 8/10 | 7/10 | 9/10 | 8/10 |
| **Weighted Total** | **8.8** | **8.2** | **7.5** | **6.9** |

## Hybrid Option

Consider combining **Idea 1 + Idea 2**: An AI savings copilot that also supports goal-based saving. The agent can help create goals through conversation:

> User: "I want to save $5K for a vacation by August"
> Agent: "Great! I'll set up a vacation savings goal with yoUSD. At current 19.48% APY, depositing $4,200 now will get you there. Want to deposit?"

This combines the strongest UX (conversation) with the strongest user story (goal-based saving) and maximizes both the UX Simplicity and Creativity scores.

## Key Technical Decisions

Regardless of which idea we pick:

1. **Chain**: Base — most vaults, best APYs, lowest gas, Merkl rewards
2. **Primary vault**: yoUSD — highest TVL ($36M), best APY (19.48%), most yield sources (52)
3. **SDK**: `@yo-protocol/core` for agent tools + `@yo-protocol/react` hooks for UI
4. **Partner ID**: Register with YO team for attribution (default 9999 works for hackathon)
5. **Wallet**: Wagmi with injected connector (MetaMask/Coinbase Wallet)

## What's Already Built (Reusable)

From `packages/mastra/`:
- Agent framework with tool system
- Chat streaming with tool output rendering
- Working memory per thread (LibSQL)
- Simulation on Anvil forks

From `packages/web/`:
- Chat UI component (`vault-alpha.tsx`)
- Tool renderer system (`alpha-tool-renderer.tsx`)
- 5-step transaction executor (`execute-actions.tsx`)
- Vault metrics cards
- Flow charts and depositor distribution
- Wagmi provider for Base/Ethereum/Arbitrum

## Next Steps

1. Pick the winning idea (recommend: Idea 1 or Hybrid 1+2)
2. Create implementation plan with phases and success criteria
3. Register partner ID with YO team
4. Build and ship
