# Session: FSN-0061 YO Treasury Code Review

**Date**: 2026-03-09
**Ticket**: `thoughts/kuba/tickets/fsn_0061-yo-treasury-code-review.md`
**Plan**: `thoughts/shared/plans/2026-03-09-FSN-0061-yo-treasury-code-review.md`

## What happened

Comprehensive code review of the entire YO Treasury hackathon project. Read all 40+ files across web components, app routes, API route, agent tools, stories, and notes.

## Files reviewed

### Web components (packages/web/src/yo-treasury/components/)
- `deposit-form.tsx` — ERC20 approve + ERC4626 deposit flow
- `withdraw-form.tsx` — ERC4626 redeem flow
- `withdraw-placeholder.tsx` — DEAD CODE, replaced by WithdrawForm
- `treasury-balances.tsx` — Treasury overview card
- `treasury-chat.tsx` — AI chat using @ai-sdk/react useChat
- `yo-tool-renderer.tsx` — Routes tool outputs to renderers
- `yo-treasury-tab.tsx` — Two-column layout (chat + forms)
- `yo-vaults-list.tsx` — Vaults table renderer

### Stories
- `deposit-form.stories.tsx`, `withdraw-form.stories.tsx`, `yo-treasury-tab.stories.tsx`

### App routes
- `/yo-treasury/page.tsx` — Main page, hardcodes base.id
- `/yo-treasury/layout.tsx` — SidebarLayout + AppProviders
- `/yo-treasury/create/page.tsx` — 6-step vault creation flow
- `/yo-treasury/create/vault-creation.constants.ts` — All addresses, ABIs, configs
- `/yo-treasury/create/use-vault-address.ts` — localStorage hook
- `/yo-treasury/create/steps/*.tsx` — 6 step components
- `/yo-treasury/create/components/step-row.tsx` — Shared step UI
- `/vaults/[chainId]/[address]/yo/page.tsx` — Per-vault YO tab

### API route
- `/api/yo/treasury/chat/route.ts` — POST handler, streams agent response

### Agent tools (packages/mastra/src/tools/yo-treasury/)
- `index.ts`, `types.ts`
- `get-yo-vaults.ts` — Lists YO vaults via @yo-protocol/core + unallocated balances
- `get-treasury-allocation.ts` — Reads treasury holdings via readYoTreasuryBalances
- `read-yo-treasury-balances.ts` — Core balance reader (ERC20 + ERC4626 positions)
- `create-yo-allocation-action.ts` — Erc4626SupplyFuse.enter() calldata
- `create-yo-withdraw-action.ts` — YoRedeemFuse.exit() calldata
- `create-yo-swap-action.ts` — Odos quote+assemble + UniversalTokenSwapperFuse

### Agent
- `yo-treasury-agent.ts` — Agent definition with system prompt + 7 tools + working memory

### Other
- `nav-config.ts` — Sidebar entries for YO Treasury
- `known-issues.md`, `05-progress-tracker.md`

## Findings

### Needs Fix (bugs/correctness)
1. **USD = $1/token assumption** — deposit-form.tsx:115-117, withdraw-form.tsx:103-105
2. **Hardcoded fallback `symbol ?? 'USDC'` and `decimals ?? 6`** — both forms
3. **Unused `parts` variable** — get-treasury-allocation.ts:33-35
4. **Dead code: WithdrawPlaceholder** — withdraw-placeholder.tsx
5. **Non-null assertions on nullable vaultAddress** — create/page.tsx:101-123
6. **`z.any()` in output schema** — get-treasury-allocation.ts:20-21

### Could Be Better
7. Deposit/Withdraw form ~60% code duplication
8. `existingActionSchema` duplicated 3x across tool files
9. Agent system prompt hardcodes addresses (can go stale)
10. `readYoTreasuryBalances` sequential multicalls per market
11. Create flow steps share identical transaction pattern
12. No mobile responsive layout

### Hacks/Workarounds (documented, intentional)
13. Delayed refetch timer (setTimeout 2s)
14. shareBalance === 0n display guard
15. `[UI rendered...]` in tool messages
16. eslint-disable in API route
17. Hardcoded KNOWN_ERC4626_MARKET_IDS

### Missing Features
18. Dashboard components (PortfolioSummary etc.)
19. No shared state between chat and forms
20. No TreasuryAllocation/SwapPreview renderers
21. Chain selector missing
22. No auth on API route
23. No error boundary for chat

### Test Gaps
24. Zero unit tests
25. No integration tests
26. No Playwright e2e tests
27. Stories are render-only
28. Agent tool error paths untested

## Plan created

5 phases:
1. Quick Fixes — dead code, unused vars, dedup schemas, proper Zod types → **DONE (FSN-0063)**
2. USD Pricing Fix — on-chain price oracle reads → **DONE (FSN-0063)**
3. Extract Shared Hook — useVaultReads to reduce duplication → **DONE (FSN-0063)**
4. UX Improvements — mobile responsive, error boundary → **PARTIALLY DONE** (mobile responsive done, error boundary not yet)
5. Test Coverage — unit tests for tools and renderers → NOT STARTED

See `sessions/session-code-review-fixes-fsn0063.md` for implementation details.
