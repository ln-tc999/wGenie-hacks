# WalletGenie — Personal Web3 CFO AI Agent

Your automated personal financial officer for the Mantle ecosystem, powered by AI agents.

**WalletGenie** is built for **The Turing Test Hackathon 2026 — Phase II: AI Awakening** (Track 6: Agentic Economy). It leverages Byreal Agent Skills and RealClaw to create a powerful, natural language-driven DeFi treasury manager.

Instead of navigating complex interfaces, users can interact with WalletGenie to analyze their wallets, build personalized yield strategies, and execute cross-protocol transactions on Mantle (including Merchant Moe, Agni Finance, Fluxion, and RWA assets like USDY and mETH) — all managed securely via on-chain vaults.

---

## 🏆 Hackathon Context

- **Network:** Mantle
- **Track:** Track 6 (Agentic Economy - Byreal Toolkit)
- **Key Technologies:**
  - **Byreal Agent Skills & RealClaw:** Core AI execution engine for on-chain interactions.
  - **Mantle DeFi Integrations:** Merchant Moe (DEX), Agni Finance (Lending), Fluxion (Yield).
  - **Mantle RWA:** Yield strategies using USDY and mETH.

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Next.js    │────▶│  Supabase       │◀────│  Ponder         │
│  Web App    │     │  (PostgreSQL)   │     │  (Indexer)      │
│  :3000      │     │  :54341 (API)   │     │                 │
│             │────▶│  :54342 (DB)    │     │  Blockchain     │
│             │     └─────────────────┘     │  Events → DB    │
│             │                             └─────────────────┘
│             │────▶┌─────────────────┐
│  Chat UI    │     │  Mastra         │
│  (Storybook │     │  (AI Agents)    │
│   :6007)    │     │  :4111          │
│             │     │                 │
└─────────────┘     │  Memory: LibSQL │
                    │  LLM: Claude /  │
                    │       GPT       │
                    └─────────────────┘
```

| Component | Package | Purpose |
|-----------|---------|---------|
| **Web App** | `packages/web` | Next.js 16 frontend — CFO dashboard, vault pages, chat UI, deposit/redeem |
| **Ponder Indexer** | `packages/ponder` | Indexes blockchain events (deposits, withdrawals, transfers) into Supabase |
| **Supabase DB** | `packages/supabase-ponder` | Local Supabase instance — PostgreSQL database + REST API |
| **Mastra Agents** | `packages/mastra` | AI agents — WalletGenie CFO agent utilizing Byreal skills for allocation, swaps, and yields |
| **SDK** | `packages/sdk` | Shared ABIs, encoding helpers, and Mantle market integrations |

---

## Prerequisites

- **Node.js** >= 22.13.0
- **pnpm** >= 10.28.2
- **Supabase CLI** — `brew install supabase/tap/supabase`
- **Docker** — required by Supabase CLI for local database
- **RPC endpoints** — Alchemy, Infura, or similar (Mantle)
- **LLM API key** — OpenRouter or OpenAI (for Mastra agents)

---

## Quick Start (Local Development)

### 1. Installation

```bash
pnpm install
```

### 2. Environment Variables

Create `.env` files based on the provided examples:

```bash
cp packages/web/.env.example packages/web/.env.local
cp packages/ponder/.env.example packages/ponder/.env.local
cp packages/mastra/.env.example packages/mastra/.env
```

Make sure to populate your API keys (OpenAI/Anthropic/OpenRouter) in `packages/mastra/.env`.

### 3. Start the Database (Supabase)

Ponder relies on a PostgreSQL database to index blockchain events. We use a local Supabase instance to handle this seamlessly while providing a robust REST API for the frontend.

```bash
cd packages/supabase-ponder
supabase start
```
*Note: This command requires Docker to be running. Run `supabase stop` when you are done to save resources.*

#### Generating Database Types
If you modify the database schema via Ponder or Supabase migrations, you must regenerate the TypeScript types:
```bash
pnpm --filter @wgenie/fusion-supabase-ponder gen:types
```
### 4. Start the Application

You can start individual components or run them all together from the root:

**Web App (Next.js):**
```bash
pnpm dev:web
# Runs on http://localhost:3000
```

**Mastra AI Server:**
```bash
pnpm dev:mastra
# API runs on http://localhost:4111
```

**Ponder Indexer:**
```bash
pnpm dev:ponder
# UI runs on http://localhost:42069
```

---

## Core Features

- **Natural Language Execution:** Say "Allocate 1000 MNT into Agni Finance" and the CFO Agent handles the transaction building.
- **Cross-Protocol Yield:** Automatically diversifies across Merchant Moe pools, Fluxion vaults, and mETH staking.
- **Real-Time Indexing:** Ponder tracks all vault state changes and syncs them instantly to the UI via Supabase real-time subscriptions.
- **Interactive UI:** A highly polished Next.js 15 App Router interface displaying charts, allocations, and transaction histories.

---

## License
MIT
