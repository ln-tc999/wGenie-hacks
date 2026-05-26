# YO Treasury — AI-Managed Yield Vault for YO Protocol

One vault for all your YO positions, securely managed by an AI agent.

DeFi yield is powerful but fragmented. YO Treasury creates a personal on-chain vault (PlasmaVault) that wraps all YO vaults into a single position. Users deposit once (USDC), and an AI copilot handles the rest — allocating across yoUSD, yoETH, yoBTC, and yoEUR, swapping between assets, and rebalancing — all executed as atomic batch transactions with a single wallet signature.

**Live demo vault on Base**: [`0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`](https://basescan.org/address/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D)

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
└─────────────┘     │                 │
                    │  Memory: LibSQL │
                    │  LLM: Claude /  │
                    │       GPT       │
                    └─────────────────┘
```

| Component | Package | Purpose |
|-----------|---------|---------|
| **Web App** | `packages/web` | Next.js 16 frontend — dashboard, vault pages, deposit/redeem UI |
| **Ponder Indexer** | `packages/ponder` | Indexes blockchain events (deposits, withdrawals, transfers) into Supabase |
| **Supabase DB** | `packages/supabase-ponder` | Local Supabase instance — PostgreSQL database + REST API |
| **Mastra Agents** | `packages/mastra` | AI agents — YO Treasury agent (allocate, swap, withdraw) and Alpha agent |
| **Fusion SDK** | `packages/sdk` | Shared vault ABIs, fuse encoding, PlasmaVault helpers |

---

## Prerequisites

- **Node.js** >= 22.13.0
- **pnpm** >= 10.28.2
- **Supabase CLI** — `brew install supabase/tap/supabase`
- **Docker** — required by Supabase CLI for local database
- **RPC endpoints** — Alchemy, Infura, or similar (Ethereum, Base, Arbitrum)
- **LLM API key** — OpenRouter or OpenAI (for Mastra agents)

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the local database (Supabase)

This starts a local Supabase instance with PostgreSQL, REST API, and Auth:

```bash
pnpm db:start
```

This runs `supabase start` inside `packages/supabase-ponder/`. On first run, it pulls Docker images (~2-3 min). Subsequent starts are fast.

Key local ports:
| Service | Port | URL |
|---------|------|-----|
| Supabase API (REST) | 54341 | `http://127.0.0.1:54341` |
| PostgreSQL (direct) | 54342 | `postgresql://postgres:postgres@127.0.0.1:54342/postgres` |
| Supabase Studio | 54343 | `http://127.0.0.1:54343` |

To stop the database: `pnpm db:stop`

### 3. Configure environment variables

Each package needs its own `.env` file. Copy from the examples:

```bash
cp packages/web/.env.example packages/web/.env
cp packages/ponder/.env.example packages/ponder/.env
cp packages/mastra/.env.example packages/mastra/.env
```

**Minimum required changes:**

#### `packages/web/.env`

The local Supabase values from `.env.example` work out of the box. You need RPC URLs:

```env
# RPC URLs (get free keys from alchemy.com)
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Mastra (local, works out of the box)
MASTRA_SERVER_URL=http://localhost:4111
```

#### `packages/ponder/.env`

```env
# Database (local Supabase, works out of the box)
PONDER_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54342/postgres

# RPC URLs
PONDER_RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

#### `packages/mastra/.env`

```env
# LLM provider (at least one required)
OPENROUTER_API_KEY=sk-or-v1-...
# or
OPENAI_API_KEY=sk-proj-...

# Ponder database (local, for SQL tools)
PONDER_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54342/postgres

# RPC URLs (for on-chain vault reads)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Tenderly Virtual TestNets (for fork simulation)
TENDERLY_RPC_URL_BASE=https://virtual.base.rpc.tenderly.co/YOUR_KEY
```

### 4. Start the Ponder indexer

In a separate terminal:

```bash
pnpm dev:ponder
```

Ponder connects to the blockchain via RPC and indexes events into the local Supabase PostgreSQL. On first run it will backfill historical data — this can take a few minutes depending on the chain and block range.

### 5. Start the Mastra agent server

In a separate terminal:

```bash
pnpm dev:mastra
```

This starts **Mastra Studio** at `http://localhost:4111`. The studio provides a web UI to test agents directly. Two agents are available:

- **YO Treasury Agent** — manages PlasmaVault positions (allocate, swap, withdraw across YO vaults)
- **Alpha Agent** — general-purpose Plasma Vault analysis agent

Memory is stored locally in `packages/mastra/mastra.db` (LibSQL file). For production, configure Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`).

### 6. Start the web app

In a separate terminal:

```bash
# YO-branded UI
pnpm dev:web:yo

# Or default Fusion UI
pnpm dev:web
```

The app runs at `http://localhost:3000`.

### 7. (Optional) Start Storybook for agent chat testing

Storybook provides an isolated chat UI for testing the AI agent with wallet interactions:

```bash
cd packages/web
pnpm sb           # without Anvil fork
pnpm sb:anvil     # with local Anvil fork for transaction testing
```

Storybook runs at `http://localhost:6007`.

---

## Running Order Summary

Start these in order (each in its own terminal):

```
1. pnpm db:start           # Local Supabase (database)
2. pnpm dev:ponder         # Blockchain indexer
3. pnpm dev:mastra         # AI agent server
4. pnpm dev:web:yo         # Web app (YO theme)
```

---

## Project Structure

```
wgenie-monorepo/
├── packages/
│   ├── web/                    # Next.js 16 web application
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages
│   │   │   ├── components/     # Shared UI components (shadcn/ui)
│   │   │   ├── yo-treasury/    # YO Treasury feature (dashboard, forms, agent chat)
│   │   │   └── lib/            # Utilities, RPC helpers, vault registry
│   │   └── .storybook/         # Storybook config (port 6007)
│   │
│   ├── ponder/                 # Blockchain event indexer
│   │   ├── src/                # Event handlers and API routes
│   │   └── ponder.config.ts    # Chain + contract configuration
│   │
│   ├── mastra/                 # AI agents (Mastra framework)
│   │   ├── src/
│   │   │   ├── agents/         # Agent definitions (yo-treasury, alpha, sql)
│   │   │   ├── tools/          # Agent tools (vault reads, tx builders, SQL)
│   │   │   │   └── yo-treasury/  # 7 YO-specific tools
│   │   │   └── mastra/         # Mastra entry point + config
│   │   └── mastra.db           # Local LibSQL memory (auto-created)
│   │
│   ├── supabase-ponder/        # Supabase client + local DB config
│   │   ├── src/                # Typed supabase-js client
│   │   └── supabase/           # Supabase CLI config (config.toml)
│   │
│   └── sdk/                    # Fusion SDK (ABIs, vault helpers)
│
├── plasma-vaults.json          # Vault registry (single source of truth)
├── pnpm-workspace.yaml         # Workspace config + dependency catalog
└── package.json                # Root scripts (db:start, dev:web, dev:ponder, dev:mastra)
```

---

## Key Root Scripts

| Script | Description |
|--------|-------------|
| `pnpm db:start` | Start local Supabase (PostgreSQL + REST API + Auth) |
| `pnpm db:stop` | Stop local Supabase |
| `pnpm db:status` | Check Supabase status |
| `pnpm dev:web` | Start web app (default config) |
| `pnpm dev:web:yo` | Start web app (YO-branded) |
| `pnpm dev:ponder` | Start Ponder blockchain indexer |
| `pnpm dev:mastra` | Start Mastra agent server + Studio |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| Wallet | wagmi 3, viem, WalletConnect |
| YO SDK | `@yo-protocol/core` (data/API), `@yo-protocol/react` (deposit/redeem hooks) |
| Vault SDK | `@wgenie/fusion-sdk` (PlasmaVault interactions, fuse encoding) |
| AI Agent | Mastra framework, Claude Haiku 4.5 / GPT |
| Database | Supabase (PostgreSQL) — local via Docker or hosted |
| Indexer | Ponder (blockchain event indexer) |
| Agent Memory | LibSQL (local file or Turso for production) |
| DEX Aggregation | Odos API |
| Fork Simulation | Tenderly Virtual TestNets |
| Charts | Recharts |
| Testing | Vitest, Storybook 9, Playwright |

---

## Troubleshooting

**Docker not running**: `pnpm db:start` requires Docker. Start Docker Desktop first.

**Port conflicts**: Supabase uses ports 54341-54343. Check with `pnpm db:status`.

**Ponder not indexing**: Verify RPC URLs are valid and have sufficient rate limits. Check terminal output for errors.

**Mastra agents not responding**: Ensure `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is set in `packages/mastra/.env`.

**Web app shows no data**: Make sure both Supabase (`pnpm db:start`) and Ponder (`pnpm dev:ponder`) are running. The web app reads indexed data from Supabase.
