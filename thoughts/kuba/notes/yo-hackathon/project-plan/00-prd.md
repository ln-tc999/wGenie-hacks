# YO Treasury — Product Requirements Document

## One-Liner

A personal yield vault with a dashboard-first portfolio view and an AI copilot for executing alpha allocation strategies across YO Protocol vaults.

## Problem

DeFi yield is fragmented and confusing. Users face three barriers:

1. **Complexity**: Understanding ERC4626 vaults, share prices, APYs, and cross-chain mechanics requires deep DeFi knowledge
2. **No personalization**: YO vaults are shared pools — users can't customize allocation strategy or asset mix
3. **Manual management**: Depositing across multiple YO vaults (yoUSD, yoETH, yoBTC) requires separate transactions with no unified portfolio view

## Solution

**YO Treasury** creates a personal wGenie Fusion PlasmaVault for each user on-chain. This vault:

- Is **owned entirely by the user** (all management roles including Alpha)
- Uses **ERC4626 fuses** to deposit into YO vaults (yoUSD, yoETH, yoBTC, yoEUR)
- Uses **UniversalTokenSwapperFuse** to swap between assets (e.g., USDC → WETH for yoETH deposits)
- Presents a **dashboard-first portfolio view** — users always see their allocations, balances, APRs, and charts in a fixed web UI without needing to interact with AI
- Includes an **AI copilot** for executing alpha actions (allocate to YO vaults, swap assets, withdraw from YO vaults) through natural conversation
- Provides **transparent allocation visibility** — users always see where their funds are

### UI Philosophy

The user's primary experience is a **normal web UI** with a portfolio dashboard showing all holdings. This builds trust — users feel safe always seeing their positions.

The **AI chat interface is secondary** but still significant. It handles alpha-only actions: viewing YO vault data, allocating capital, swapping assets, and withdrawing from YO vaults. Deposit into treasury and withdraw from treasury use standard web UI forms.

## Target Users

1. **Crypto holders** who want yield but find DeFi overwhelming — the dashboard shows everything clearly, and the chat removes friction for allocation decisions
2. **Power users** who want a personal vault-of-vaults with custom allocation across YO strategies
3. **Small treasuries / teams** who want a dedicated on-chain treasury earning yield across multiple assets

## Hackathon Alignment

| Judging Criterion (Weight) | How We Win |
|---|---|
| **UX Simplicity (30%)** | Dashboard-first: portfolio is always visible. Chat for actions: "Put half in yoETH." Zero DeFi jargon required. |
| **Creativity (30%)** | A meta-vault (Fusion PlasmaVault) on top of YO — nobody else will build a vault-of-vaults with AI management, integrated swaps, and a full portfolio dashboard. |
| **Integration (20%)** | Deepest possible: `@yo-protocol/core` for vault data + ERC4626 standard for deposits + real on-chain Fusion vault + swap aggregators. |
| **Risk & Trust (20%)** | User owns all vault roles. Full allocation transparency via always-visible dashboard. Funds always in user's vault. Simulation before every action. |

## Scope

### In Scope

- Multi-chain support (Base primary, Ethereum, Arbitrum)
- In-app vault creation via FusionFactory.clone()
- Deposit whitelist via WHITELIST_ROLE (vault stays non-public)
- ERC4626SupplyFuse for YO vault deposits/withdrawals
- UniversalTokenSwapperFuse for asset swaps (via Odos/KyberSwap/Velora on Base)
- Treasury asset: USDC (hardcoded)
- Portfolio dashboard as primary UI (allocations, APRs, charts, total value)
- Deposit/withdraw treasury via standard web UI forms
- AI copilot agent (Mastra) for alpha actions (allocate, swap, withdraw from YO vaults)
- Chat UI with tool renderers for vault data, allocations, swap previews
- 5-step transaction executor (reuse existing)
- Real deposit/redeem/swap flows with on-chain transactions
- Fork-based testing (Hardhat) for on-chain logic
- Playwright MCP for web UI testing

### Out of Scope

- Merkl rewards claiming (nice-to-have, not core)
- Multi-vault per user (one vault per chain is enough for hackathon)
- Automated rebalancing / keeper bot (user-initiated only)
- Mobile-specific UI (responsive web is fine)
- Pendle PT swaps (only standard asset swaps via aggregator)
- Yield projection / future yield forecasting (only display current APRs)
- Making vault public (convertToPublicVault is irreversible — use whitelist instead)

## YO Vault Availability by Chain

| Vault | Base (8453) | Ethereum (1) | Arbitrum (42161) |
|-------|------------|-------------|-----------------|
| yoUSD | yes | yes | yes |
| yoETH | yes | yes | - |
| yoBTC | yes | yes | - |
| yoEUR | yes | yes | - |
| yoGOLD | - | yes | - |
| yoUSDT | - | yes | - |

**Base is the happy path** — most vaults, best APYs, lowest gas, swap infrastructure available.

## Key Differentiators vs. Other Hackathon Submissions

1. **On-chain personal vault** — not just a UI wrapper around YO SDK calls
2. **Dashboard-first transparency** — users always see holdings without needing to ask AI
3. **AI-managed allocation** — conversation-driven alpha strategy, not forms and buttons for complex actions
4. **Cross-asset swaps** — user can deposit USDC and have the vault swap to WETH for yoETH
5. **Composability story** — demonstrates ERC4626 composability (Fusion vault wrapping YO vaults)
6. **Simulation before execution** — Tenderly fork shows balance changes before signing

## Key Structural Decision

**No new packages.** We extend `packages/web` rather than creating a new `packages/yo-treasury` package. This gives us wagmi, shadcn, sidebar, auth, chat patterns, transaction execution components, and the full App Router setup for free. All yo-treasury code lives in `packages/web/src/yo-treasury/` (constants, lib, components) plus `packages/mastra/` (agent + tools) and `packages/hardhat-tests/` (fork tests).

## Screenshots

All screenshots go to: `thoughts/kuba/notes/yo-hackathon/screenshots/`
Do NOT create screenshots at repository root level.

## Demo Vault (Live on Base)

A fully configured demo vault is deployed and registered:
- **Address**: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`
- **Chain**: Base (8453), start block 43046896
- **Dashboard**: http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D
- **Vault creation page**: http://localhost:3000/yo-treasury/create
- **Registered in**: `plasma-vaults.json` as "YO Treasury"
- **Config**: All roles granted, 9 fuses installed (4 supply + 4 redeem + 1 swap), 5 substrate groups, 4 dependency graphs

## Adaptive Approach

This plan is a high-level overview that **will evolve during implementation**. We start with basics and adjust as we learn. Detailed tickets are created only for the very next step — not for far-future work. If initial assumptions prove wrong, the plan changes. The `project-plan/` directory holds the overview; implementation tickets are created incrementally.
