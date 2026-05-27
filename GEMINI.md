# WalletGenie — Personal Web3 CFO AI Agent

WalletGenie is a comprehensive monorepo for an AI-powered DeFi treasury manager on the Mantle ecosystem. It allows users to manage yield strategies, execute cross-protocol transactions, and analyze wallet data using natural language interactions.

## Project Overview

- **Purpose:** Personal Web3 CFO AI Agent for Mantle.
- **Architecture:** pnpm monorepo with multiple specialized packages.
- **Main Technologies:**
    - **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS 4, Radix UI, TanStack Query, Recharts, Wagmi/Viem.
    - **AI Agents:** Mastra (v1.2.0), AI SDK (Vercel), LLMs (Claude/GPT via OpenRouter/OpenAI).
    - **Indexer:** Ponder (Blockchain event indexing across multiple chains).
    - **Database:** Supabase (Local PostgreSQL) + LibSQL (Mastra memory).
    - **Blockchain:** Mantle (Primary), Arbitrum, Base, Mainnet, Unichain, Plasma.
    - **SDK:** Shared TypeScript SDK for smart contract interactions.

## Monorepo Structure

| Package | Purpose | Key Technologies |
| :--- | :--- | :--- |
| `packages/web` | Next.js 16 Dashboard & Chat UI | Next.js, React, Tailwind, Wagmi |
| `packages/mastra` | AI Agent Server | Mastra, AI SDK, Hono |
| `packages/ponder` | Blockchain Event Indexer | Ponder, Viem |
| `packages/sdk` | Shared ABIs and Logic | Viem, TypeScript |
| `packages/supabase-ponder` | Local Supabase Setup | Supabase CLI, Docker |
| `packages/hardhat-tests` | Contract Integration Tests | Hardhat, Viem |

## Getting Started

### Prerequisites
- Node.js >= 22.13.0
- pnpm >= 10.28.2
- Supabase CLI & Docker (for local DB)

### Setup
1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Environment Variables:**
    Copy `.env.example` to `.env` in `packages/web`, `packages/ponder`, and `packages/mastra`. Populate with required API keys (RPCs, LLMs).
3.  **Start Database:**
    ```bash
    pnpm db:start
    ```

## Key Commands

### Development
- `pnpm dev:web`: Starts the Next.js frontend (http://localhost:3000).
- `pnpm dev:mastra`: Starts the Mastra AI server (http://localhost:4111).
- `pnpm dev:ponder`: Starts the Ponder indexer (UI at http://localhost:42069).
- `pnpm db:start` / `pnpm db:stop`: Manage local Supabase instance.

### Build & Test
- `pnpm build:web`: Build the frontend.
- `pnpm build:sdk`: Build the shared SDK.
- `pnpm test:sdk`: Run SDK unit tests (Vitest).
- `pnpm test:hardhat`: Run integration tests against live contracts.

### Database
- `pnpm --filter @wgenie/fusion-supabase-ponder gen:types`: Regenerate Supabase TS types.
- *Note: Ponder automatically manages schema migrations in Supabase based on `ponder.schema.ts`.*

## Development Conventions

- **Code Style:** Prettier and ESLint are enforced. Run `pnpm format` or `pnpm lint` in packages.
- **State Management:** TanStack Query for server state; Wagmi for blockchain state.
- **Testing:** Vitest for unit tests; Storybook for UI components; Playwright for E2E.
- **AI Integration:** Mastra agents (`alphaAgent`, `wgenieCfoAgent`) are exposed via Hono API routes.
- **Security:** In early development. Avoid hardcoding secrets. Use `.env` files. Access control is currently minimal for MVP.

## Important Documentation
- `README.md`: Main project overview and architecture.
- `PLANNING.md`: Roadmap for removing legacy `yo-protocol` code.
- `.ai/`: Detailed technical stack, security considerations, and monorepo plans.
- `mantle-reesources.md`: Mantle-specific developer resources.
