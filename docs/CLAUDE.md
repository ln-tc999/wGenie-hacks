# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**WalletGenie** — an AI "personal Web3 CFO" for the Mantle ecosystem (Turing Test Hackathon 2026, Track 6). Users chat in natural language to analyze wallets and propose/execute DeFi transactions (Merchant Moe DEX, Aave V3, Byreal Solana pools), routed through on-chain treasury/ERC4626 vaults.

pnpm monorepo (`packages/*`), Node >= 22.13, **pnpm** 10.28.2 (not npm/yarn).

## Commands

Run from repo root; package scripts use `pnpm --filter <pkg> <script>`.

```bash
pnpm install
pnpm db:start / db:stop          # local Supabase + Postgres (needs Docker); required before Ponder
pnpm dev:web                     # Next.js → :3000
pnpm dev:ponder                  # indexer → :42069
pnpm build:sdk                   # rebuild SDK after editing it (web/ponder consume it via workspace:*)
pnpm test:sdk                    # vitest run
pnpm test:hardhat                # Solidity tests
pnpm --filter @wgenie/fusion-web test:run     # web tests (vitest)
pnpm --filter @wgenie/fusion-web storybook    # component dev → :6007

# Single test
pnpm --filter @wgenie/fusion-sdk exec vitest run path/to/file.test.ts -t "name"

# Contracts (Foundry) — MUST use ~/.foundry/bin/forge (global `forge` is a different tool)
pnpm compile                     # ~/.foundry/bin/forge build
pnpm deploy:mantle               # forge script Deploy.s.sol --broadcast (Mantle Sepolia)
```

- **Ponder auto-migrates**: edit `packages/ponder/ponder.schema.ts` + restart → tables recreated. Then `pnpm --filter @wgenie/fusion-supabase-ponder gen:types`.
- Each package has its own `.env.local` (copy from `.env.example`).

## Architecture

Packages: **web** (`@wgenie/fusion-web`, Next.js 16 App Router + the CFO agent route) · **ponder** (multi-chain event indexer) · **supabase-ponder** (local Supabase + generated DB types) · **sdk** (`@wgenie/fusion-sdk` — shared ABIs/encoding/PlasmaVault reader/market integrations) · **hardhat-tests** (Solidity + Foundry deploy).

Data flow: chain events → **Ponder** → **Supabase/Postgres** → **web** (Supabase REST + real-time; direct chain reads via viem RPC).

### CFO agent (key, non-obvious)

No agent framework — Mastra was removed. The whole agent is one Next.js route: `packages/web/src/app/api/cfo/treasury/chat/route.ts`. It does a direct `fetch` to the **NVIDIA API** (Llama 3.3 70B) with function calling and streams SSE in `ai` SDK v6 `uiMessageChunkSchema` so the frontend `useChat` (`@ai-sdk/react`) works unchanged. Tools are inline (`Record<name, {description, zod params, handler}>`):
- **Mantle** (viem reads + `encodeFunctionData` → treasury `execute()` proposals): `readWalletGenieTreasury`, `readTreasuryBalances`, `createMerchantMoeSwapAction`, `createAaveAllocationAction`, `createAaveWithdrawAction`.
- **Byreal/Solana** (shell out to `byreal-cli` via `execSync`): `getByrealTopPools`, `analyzeByrealPool`, `simulateByrealSwap`, `executeByrealSwap`.

CFO UI: `packages/web/src/wgenie-cfo/`. Route env: `NVIDIA_API_KEY`, `MANTLE_RPC_URL`, `MANTLE_SEPOLIA_RPC_URL`.

### Multi-tenant config

Web app is white-labeled via `NEXT_PUBLIC_APP_CONFIG` (`packages/web/src/lib/app-config.ts`): one codebase, ~18 branded dashboards (`fusion`, `wgenie`, `all`, atomist configs) each with logo/theme/nav + feature flags. Per-config dev scripts exist (`dev:wgenie-dao`, etc.). Go through `getAppConfig()` — don't hardcode branding/feature gates.

### On-chain

- ERC4626 + PlasmaVault "fuse" architecture; `PlasmaVault.create(client, addr)` is the reader entrypoint.
- Mantle mainnet **5000**, Sepolia **5003**. Aave V3 Pool `0x458F293454fE0d67EC0655f3672301301DD51422`. `WalletGenieTreasury` (Sepolia): `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4`.
- `viem` pinned to `2.45.1` (root override + catalog) — keep consistent.
- Mantle network/protocol/RWA details: `mantle-reesources.md`. Foundry contracts in submodules under `external/` + `lib/forge-std` (`git submodule update --init` if missing).

## Gotchas

- Start Docker + `pnpm db:start` before Ponder.
- **`AGENTS.md` is stale** — references a removed `packages/mastra` server on :4111 / `pnpm dev:mastra`. Trust this file + README instead.

## Browser Automation Notes

### Mastra Agent Chat

When testing agents in Mastra Studio, browser automation can type and submit messages (press Enter) normally.
