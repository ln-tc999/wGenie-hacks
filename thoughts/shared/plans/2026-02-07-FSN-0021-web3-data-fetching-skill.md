# Web3 Data Fetching Skill — Implementation Plan

## Overview

Create a Claude Code skill (`web3-data-fetching`) that teaches the **Fetch → Mapper → UI/Hook** architecture for blockchain data fetching in React. The skill will combine industry best practices (from Euler Finance / Srdjan Rakic's articles) with wGenie monorepo-specific patterns (server-side RPC enrichment, Supabase integration, wagmi multicall).

## Current State Analysis

### Source Material
- **Euler Finance article** (X/Twitter, Jan 2026): "The Architecture That Fixed Euler's Frontend Performance" — covers problems at scale (useMemo explosion, hook-heavy approach, unpredictable re-renders) and the Fetch → Mapper → Hook solution
- **Dev.to blog** (Dec 2025): "The Web2 Mental Model Doesn't Work in Web3" — detailed code examples of the 3-layer architecture with React Query's non-hook API

### wGenie Monorepo Current Patterns
The codebase already partially implements this architecture:
- **Server-side enrichment** (`packages/web/src/lib/rpc/`) — viem multicall, in-memory cache (10min TTL), batch fetching with `Promise.all`
- **React Query** — global 5min staleTime, per-query overrides, Zod validation on responses
- **Wagmi hooks** — `useReadContracts` with `staleTime: Infinity` for immutable data (name, symbol, decimals)
- **Data merge** — `fetchVaults()` combines static registry + RPC + Supabase data

**Gap**: No explicit mapper layer; transformation happens inline during fetch/enrichment. Client-side hooks combine multiple `useQuery`/`useReadContract` with `enabled` chains.

## Desired End State

A skill at `.agents/skills/web3-data-fetching/` that:
- Triggers when writing/reviewing React code that fetches blockchain data
- Teaches the Fetch → Mapper → Hook pattern with concrete code examples
- Includes wGenie-specific patterns (server-side RPC, Supabase, vault data flow)
- Follows progressive disclosure: lean SKILL.md + detailed references

### Verification
- Skill passes `scripts/package_skill.py` validation
- SKILL.md is under 500 lines
- References contain actionable code examples from both source articles and our codebase

## What We're NOT Doing

- Not refactoring existing wGenie codebase to match the pattern (that's a separate task)
- Not creating scripts or assets (this is a knowledge/reference skill)
- Not covering wallet connection, transaction signing, or other web3 topics beyond data fetching

## Implementation Approach

Use the `skill-creator` skill process: understand → plan → init → edit → package.

Since the skill's content is already well-understood from the source articles and codebase analysis, we can move directly to implementation.

## Phase 1: Initialize Skill

### Overview
Create the skill directory structure using `init_skill.py`.

### Changes Required:

#### 1. Run init script

```bash
python3 .agents/skills/skill-creator/scripts/init_skill.py web3-data-fetching --path .agents/skills
```

#### 2. Clean up generated scaffolding
- Remove `scripts/` and `assets/` example directories (not needed for this knowledge skill)
- Keep `references/` directory

### Success Criteria:

#### Automated Verification:
- [ ] Directory `.agents/skills/web3-data-fetching/` exists
- [ ] `SKILL.md` template is present

---

## Phase 2: Write SKILL.md

### Overview
Write the core skill file with frontmatter, architecture overview, and references index.

### Content Structure:

```markdown
---
name: web3-data-fetching
description: Web3 blockchain data fetching architecture for React applications.
  Teaches the Fetch → Mapper → Hook pattern for onchain data. Use when writing,
  reviewing, or refactoring code that fetches blockchain data via RPC calls,
  wagmi hooks, or React Query in web3 contexts. Triggers on tasks involving
  contract reads, onchain data fetching, vault data, token balances, DeFi
  frontend performance, or React Query usage with blockchain data.
---

# Web3 Data Fetching

## Core Architecture: Fetch → Mapper → Hook

Three layers to keep blockchain data fetching clean and performant:

### Layer 1 — Fetchers (RPC + Cache)
- Pure functions using `queryClient.fetchQuery()` (NOT hooks)
- Each fetcher owns its own `staleTime`
- Use wagmi `readContractQueryOptions` for contract reads

### Layer 2 — Mappers (Business Logic)
- Plain async functions calling fetchers
- Normal JS control flow: if/else, for loops, early returns, throw
- `Promise.all` for parallel fetching
- Format and derive all values here

### Layer 3 — Hook/UI (Reactivity)
- Single `useQuery` wrapping the mapper
- UI-level staleTime (15-60s) prevents re-render storms
- Components render pre-formatted data, no `useMemo` needed

## Quick Pattern

[Concise code example showing all 3 layers]

## wGenie Monorepo Specifics

[How our server-side RPC enrichment, Supabase, and vault registry fit]

## References

- **Full pattern with code examples**: See references/architecture.md
- **Common anti-patterns to avoid**: See references/anti-patterns.md
- **Caching strategies per data type**: See references/caching.md
- **wGenie-specific data flow**: See references/wgenie-patterns.md
```

### Success Criteria:

#### Automated Verification:
- [ ] SKILL.md has valid YAML frontmatter with `name` and `description`
- [ ] SKILL.md is under 500 lines
- [ ] All referenced files exist in `references/`

---

## Phase 3: Write Reference Files

### Overview
Create detailed reference documents with code examples.

### Changes Required:

#### 1. `references/architecture.md` — Full Fetch → Mapper → Hook Pattern

Content from both articles, organized as:
- **Fetcher examples**: Token decimals (Infinity cache), token balance (1min cache), vault owner (30min cache)
- **Mapper example**: `displayBalanceMapper` combining fetchers with Promise.all
- **Batch mapper**: `displayBalancesMapper` mapping over array of tokens
- **Hook example**: Single `useQuery` wrapping mapper with UI-level staleTime
- **Code**: Use wagmi `readContractQueryOptions` + `getQueryClient().fetchQuery()`

#### 2. `references/anti-patterns.md` — What NOT to Do

Content covering:
- **Hook-heavy approach**: Multiple `useQuery` hooks with `enabled` chains → complex loading/error state aggregation
- **useMemo explosion**: N vaults × M memos = N×M dependency arrays checked every render
- **Reactive data layer**: hooks on hooks, 500+ line composite hooks
- **Early abstractions**: Premature generalizations that can't support project evolution
- Side-by-side "before/after" code comparisons

#### 3. `references/caching.md` — Caching Strategies

Content covering:
- **Per-data-type staleTime**: Immutable (Infinity), slow-changing (30min), live (1min)
- **UI-level cache**: staleTime on useQuery wrapping mapper (15-60s) to prevent formatting/sorting re-runs
- **queryClient.fetchQuery** vs `useQuery`: when each fires, deduplication behavior
- **Server-side cache**: In-memory Map with TTL for RPC data (our pattern)

#### 4. `references/wgenie-patterns.md` — wGenie Monorepo Specifics

Content covering:
- **Server-side RPC enrichment**: `packages/web/src/lib/rpc/` — viem multicall, fetchWithRetry, batch fetching
- **Data flow**: Static vault registry (`plasma-vaults.json`) + RPC data + Supabase indexed events
- **Supabase patterns**: BigInt handling, text columns, snake_case → camelCase mapping
- **Wagmi config**: Per-chain transports, `useReadContracts` for batched reads
- **Current architecture diagram**: How data flows from chain/DB → server functions → API routes → React Query → UI

### Success Criteria:

#### Automated Verification:
- [ ] All 4 reference files exist and are non-empty
- [ ] No broken internal links in SKILL.md

---

## Phase 4: Package and Validate

### Overview
Run the skill-creator packaging script to validate and package the skill.

### Changes Required:

```bash
python3 .agents/skills/skill-creator/scripts/package_skill.py .agents/skills/web3-data-fetching
```

Fix any validation errors and re-run until clean.

### Success Criteria:

#### Automated Verification:
- [ ] `package_skill.py` passes validation with no errors
- [ ] `.skill` file is generated

#### Manual Verification:
- [ ] Skill triggers correctly when asking about web3 data fetching
- [ ] References contain actionable, accurate code examples
- [ ] wGenie-specific patterns match actual codebase

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the skill triggers and content quality is acceptable.

---

## Testing Strategy

### Manual Testing Steps:
1. Start a new Claude Code conversation in the monorepo
2. Ask "How should I fetch token balances for a vault?" — skill should trigger
3. Ask "Review this useQuery hook for contract reads" — skill should trigger
4. Verify the architecture pattern and code examples are coherent and actionable
5. Verify wGenie-specific references accurately describe our codebase

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0021-create-skill-best-practices-web3.md`
- Euler Finance article: https://x.com/eulerfinance/status/2010734949955928472
- Dev.to blog: https://dev.to/92srdjan/the-web2-mental-model-doesnt-work-in-web3-18on
- Skill creator guide: `.agents/skills/skill-creator/SKILL.md`
- Similar skill (structure reference): `.agents/skills/vercel-react-best-practices/`
