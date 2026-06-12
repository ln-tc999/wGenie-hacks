# WalletGenie — Personal Web3 CFO AI Agent

Your automated personal financial officer for the Mantle ecosystem, powered by AI agents.

**WalletGenie** is built for **The Turing Test Hackathon 2026 — Phase II: AI Awakening** (Track 6: Agentic Economy). It leverages Byreal Agent Skills to create a powerful, natural language-driven DeFi treasury manager.

Instead of navigating complex interfaces, users can interact with WalletGenie to analyze their wallets, build personalized yield strategies, and execute cross-protocol transactions on Mantle (including Merchant Moe DEX and Aave V3 lending) — all managed securely via on-chain vaults.

---

## Hackathon Context

- **Network:** Mantle
- **Track:** Track 6 (Agentic Economy — Byreal Toolkit)
- **Key Technologies:**
  - **Byreal Agent Skills:** Solana CLMM DEX integration — pool research (APR/TVL/volume), swap simulation, and execution
  - **Mantle DeFi Integrations:** Merchant Moe (DEX), Aave V3 (Lending)
  - **AI LLM:** Llama 3.3 70B via NVIDIA API, function calling for on-chain proposals

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js     │────▶│  Supabase        │◀────│  Ponder         │
│  Web App     │     │  (PostgreSQL)    │     │  (Indexer)      │
│  :3000       │     │  :54341 (API)    │     │                 │
│              │────▶│  :54342 (DB)     │     │  Blockchain     │
│              │     └──────────────────┘     │  Events → DB    │
│              │                              └─────────────────┘
│  /api/cfo/   │────▶┌──────────────────┐
│  treasury/   │     │  CFO Agent       │
│  chat        │     │  (Next.js Route) │
│              │     │                  │
│  Chat UI     │     │  NVIDIA API      │
│  (useChat)   │     │  (Llama 3.3)     │
│              │     │  Byreal CLI      │
│              │     │  viem (RPC)      │
└──────────────┘     └──────────────────┘
```

| Component | Package | Purpose |
|-----------|---------|---------|
| **Web App** | `packages/web` | Next.js 16 frontend — CFO dashboard, vault pages, chat UI, deposit/redeem |
| **CFO Agent** | `packages/web` (route) | AI chat agent at `/api/cfo/treasury/chat` — direct HTTP fetch to NVIDIA API + SSE stream |
| **Ponder Indexer** | `packages/ponder` | Indexes blockchain events (deposits, withdrawals, transfers) into Supabase |
| **Supabase DB** | `packages/supabase-ponder` | Local Supabase instance — PostgreSQL database + REST API |
| **SDK** | `packages/sdk` | Shared ABIs, encoding helpers, and Mantle market integrations |

---

## Prerequisites

- **Node.js** >= 22.13.0
- **pnpm** >= 10.28.2
- **Supabase CLI** — `brew install supabase/tap/supabase`
- **Docker** — required by Supabase CLI for local database
- **RPC endpoints** — Mantle RPC URL (Alchemy or similar)
- **NVIDIA API key** — for Llama 3.3 70B model
- **Byreal CLI** — `npm install -g @byreal-io/byreal-cli@0.3.6`

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
```

Populate your NVIDIA API key and Mantle RPC URLs in `packages/web/.env.local`.

### 3. Start the Database (Supabase)

Ponder relies on a PostgreSQL database to index blockchain events. We use a local Supabase instance to handle this seamlessly while providing a robust REST API for the frontend.

```bash
pnpm db:start
```
*Note: This command requires Docker to be running. Run `pnpm db:stop` when you are done to save resources.*

#### Database Migrations
You do not need to run manual `db push` or migration commands! Because we use **Ponder** as our indexer, it automatically manages the database schema. Whenever you modify `packages/ponder/ponder.schema.ts` and restart Ponder, it will automatically drop and recreate the necessary tables in Supabase.

#### Generating Database Types
If you modify the database schema via Ponder, you must regenerate the TypeScript types for the frontend and API:
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

**CFO Agent API:**
The CFO agent runs as a Next.js API route (`/api/cfo/treasury/chat`). No separate server needed — it's part of the web app.

**Ponder Indexer:**
```bash
pnpm dev:ponder
# UI runs on http://localhost:42069
```

---

## CFO Agent Capabilities

The WalletGenie CFO agent is a full-featured AI chat interface at `/api/cfo/treasury/chat`. It uses Llama 3.3 70B via NVIDIA API with function calling.

### Mantle Tools (On-Chain)
| Tool | Description |
|------|-------------|
| `readWalletGenieTreasury` | Check treasury MNT balance, owner, manager, user deposits |
| `readTreasuryBalances` | Check ERC-20 token balances with USD values via PlasmaVault |
| `createMerchantMoeSwapAction` | Propose a swap through treasury `execute()` on Merchant Moe DEX |
| `createAaveAllocationAction` | Propose Aave V3 supply (lending) |
| `createAaveWithdrawAction` | Propose Aave V3 withdraw |

### Byreal Tools (Solana — Track 6)
| Tool | Description |
|------|-------------|
| `getByrealTopPools` | List top-performing pools by APR/TVL/volume on Byreal CLMM DEX |
| `analyzeByrealPool` | Deep-dive analysis of a specific pool (price range, volatility, fee APR) |
| `simulateByrealSwap` | Dry-run a swap to preview price impact and output amount |
| `executeByrealSwap` | Execute a swap (requires user confirmation for amounts >$1000) |

### Agent Workflow
1. User asks about treasury → `readWalletGenieTreasury`
2. User wants yield → propose Aave V3 supply/withdraw
3. User wants swap on Mantle → `createMerchantMoeSwapAction`
4. User wants Byreal research → `getByrealTopPools` / `analyzeByrealPool`
5. User wants Byreal trade → `simulateByrealSwap` first, then `executeByrealSwap` with confirmation

### Technical Details
- **No Mastra**: The CFO agent is a single Next.js API route (~370 lines) using direct HTTP fetch to NVIDIA API — no agent framework overhead
- **SSE streaming**: Output formatted in `uiMessageChunkSchema` compatible with `ai` SDK v6 `DefaultChatTransport`
- **Frontend**: Uses `useChat` from `@ai-sdk/react` — no changes needed for tool calls
- **Byreal integration**: `byreal-cli` called via `child_process.execSync` — read-only tools work without wallet setup

---

## Core Features

- **Natural Language Execution:** Say "Check my treasury balance" or "Show me top Byreal pools" and the CFO Agent handles it.
- **Cross-Protocol Yield:** Diversify across Merchant Moe DEX swaps, Aave V3 lending, and Byreal Solana pools.
- **Real-Time Indexing:** Ponder tracks all vault state changes and syncs them instantly to the UI via Supabase real-time subscriptions.
- **Interactive UI:** Next.js 16 App Router interface displaying charts, allocations, and transaction histories.

---

## Smart Contracts

**WalletGenieTreasury** — deployed & verified on Mantle Sepolia testnet (5003):

| Field | Value |
|-------|-------|
| **Contract** | [`0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4`](https://explorer.sepolia.mantle.xyz/address/0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4) |
| **Tx Hash** | [`0x465f208ea10482525c71299288bab5233e372de0e7a2afe150689839132e3faf`](https://explorer.sepolia.mantle.xyz/tx/0x465f208ea10482525c71299288bab5233e372de0e7a2afe150689839132e3faf) |
| **Block** | `39471829` |
| **Owner** | `0x3a8d93D5F52a26689b075A49E67F4f8924BeC84B` |

### Aave V3 (Mantle Mainnet 5000)
| Contract | Address |
|----------|---------|
| **Pool** | `0x458F293454fE0d67EC0655f3672301301DD51422` |
| **Pool Addresses Provider** | `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f` |

---

## License
MIT
