# FSN-0086: Deploy Mastra to Vercel

## Context

This is a handoff from FSN-0085 (Deploy to Vercel). Phases 1-3 are complete — all code changes are done and verified locally. The web app builds successfully. The blocker is deploying the Mastra package to Vercel.

## What's Already Done

### Phase 1: Mastra code changes (COMPLETE)
- `packages/mastra/src/storage.ts` — shared `createStorage()` helper with Turso/local fallback
- `packages/mastra/src/env.ts` — added `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` env vars
- `packages/mastra/src/mastra/index.ts` — `VercelDeployer` with `regions: ['fra1']`, shared storage
- `packages/mastra/src/agents/alpha-agent.ts` — uses shared storage
- `packages/mastra/src/agents/yo-treasury-agent.ts` — uses shared storage
- All `@mastra/*` packages upgraded from 1.2.0 to 1.14.0
- `@mastra/deployer-vercel` added
- `@mastra/core` and `@mastra/ai-sdk` re-added as deps (were accidentally dropped during upgrade)

### Phase 2: Web decoupling (COMPLETE)
- `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts` — HTTP proxy to `MASTRA_SERVER_URL`
- `packages/web/src/app/api/yo/treasury/chat/route.ts` — HTTP proxy to `MASTRA_SERVER_URL`
- `@mastra/core` and `@mastra/ai-sdk` removed from web deps
- `MASTRA_SERVER_URL` added to web `.env` and `.env.example`

### Phase 3: Web Vercel config (COMPLETE)
- `packages/web/next.config.ts` — `transpilePackages`, `outputFileTracingRoot`
- `packages/web/vercel.json` — install/build commands with SDK pre-build
- `packages/web/tsconfig.json` — ES2020 to ES2022
- Root `package.json` — `packageManager: "pnpm@10.28.2"`, `onlyBuiltDependencies: ["esbuild", "sharp"]`

### Infrastructure provisioned
- **Turso DB**: `fusion-monorepo-mastra` at `libsql://fusion-monorepo-mastra-lebrande.aws-eu-west-1.turso.io`
- **Vercel project**: `fusion-monorepo-mastra` (linked at `packages/mastra/.vercel/`)
- **Vercel env vars set** (production): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `OPENROUTER_API_KEY`, `MODEL`, `BASE_RPC_URL`, `ETHEREUM_RPC_URL`, `ARBITRUM_RPC_URL`
- **Vercel plan**: Pro (30-core/60GB Turbo Build Machines)

## The Blocker: `mastra build` OOM on Vercel

`mastra build` (the bundler that produces `.vercel/output/`) requires **8GB+ Node.js heap**. On Vercel's build machines, Node.js defaults to ~4GB heap limit. Even with `NODE_OPTIONS=--max-old-space-size=16384` set as a Vercel env var, the build still crashes with exit code 134 (SIGABRT / heap OOM).

### Error output
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

### What was tried
1. **Remote build (Hobby plan, 2-core/8GB)** — OOM (exit 137)
2. **Prebuilt deploy** (`vercel deploy --prebuilt`) — builds locally, uploads `.vercel/output/`. Deploys successfully but **FUNCTION_INVOCATION_FAILED** at runtime because native modules (`@libsql/darwin-arm64`) are macOS binaries, not Linux
3. **Remote build (Pro plan, 30-core/60GB)** — OOM (exit 134). Node heap still limited
4. **NODE_OPTIONS env var** (`--max-old-space-size=16384`) — set as Vercel env var. Still OOM
5. **NODE_OPTIONS in buildCommand** (single-quoted in JSON) — still OOM
6. **Manually adding `@libsql/linux-x64-gnu`** to prebuilt output — deployed but still FUNCTION_INVOCATION_FAILED

### Approaches NOT yet tried
1. **Build in Docker locally** (Linux x64) then `vercel deploy --prebuilt` — would produce Linux-native binaries
2. **Cross-platform install**: `npm_config_platform=linux npm_config_arch=x64 pnpm install` in the `.vercel/output/functions/index.func/` before prebuilt deploy
3. **GitHub Actions CI**: Build on Linux runner, deploy to Vercel via `vercel deploy --prebuilt --token $VERCEL_TOKEN`
4. **Railway instead of Vercel**: Mastra produces a standalone Node.js server. Railway supports Docker/Node.js natively with no build memory limits
5. **Reduce bundle**: Strip unused agents (sqlAgent, plasmaVaultAgent) to reduce bundler memory usage
6. **Use `@mastra/pg` (PostgresStore) instead of LibSQLStore**: eliminates `@libsql/client` native binding entirely, uses pure-JS `pg` package. Could use Supabase Postgres we already have
7. **Contact Mastra team**: The 8GB+ heap usage for bundling is excessive — may be a known issue

## Current vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter @wgenie/fusion-sdk build && pnpm --filter @wgenie/fusion-mastra build",
  "regions": ["fra1"]
}
```

## Once Mastra is deployed

1. Note the Mastra URL (e.g., `https://fusion-monorepo-mastra.vercel.app`)
2. Test: `curl https://<mastra-url>/api/agents` should return agent list
3. Deploy web:
   ```bash
   cd packages/web
   vercel link  # Create project: fusion-monorepo-web
   # Set env vars (see plan: thoughts/shared/plans/2026-03-19-FSN-0085-deploy-to-vercel.md, Phase 4)
   # IMPORTANT: set MASTRA_SERVER_URL=https://<mastra-url>.vercel.app
   vercel --prod
   ```
4. Test web: vault list loads, chat proxies to Mastra, streaming works

## References

- Full plan: `thoughts/shared/plans/2026-03-19-FSN-0085-deploy-to-vercel.md`
- Ticket: `thoughts/kuba/tickets/fsn_0085-deploy-to-vercel.md`
- [Mastra Deploy to Vercel docs](https://mastra.ai/guides/deployment/vercel)
- [Mastra OOM issue context](https://github.com/mastra-ai/mastra/issues/2752)

## Instructions

- Your goal is to deploy mastra to remote envirnoment
- Build mastra locally first as a test
- Ensure that only mastra packege is used only with necesary dependencies
- Read docs: https://mastra.ai/guides/deployment/vercel
