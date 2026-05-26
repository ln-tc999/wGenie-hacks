# Session: Chat UI Polish & Agent Tuning

**Date**: 2026-03-07
**Branch**: yo-hackathon
**Ticket**: FSN-0057

## What Was Done

### 1. E2E Browser Test of Chat Flow
Tested 6 scenarios via Playwright MCP at `http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D/yo`:
- "What are my yield options?" — vaults table renders
- "Show my allocation" — treasury balances render
- "Put 50 USDC in yoUSD" — action created with simulation
- "Swap 100 USDC to WETH" — swap action queued
- "Show pending actions" — pending list renders
- "Execute" — execute flow triggered
All passed.

### 2. YoVaultsList Component Rewrite
Converted from Card-based layout to HTML `<table>` with 5 columns:
- Vault (icon + symbol + underlying)
- TVL
- APR (green, mono font)
- Balance (user position from on-chain data)
- Value (USD)

Multiple iteration rounds with user on spacing, width (`w-[30rem]`), and content.

**File**: `packages/web/src/yo-treasury/components/yo-vaults-list.tsx`

### 3. getYoVaultsTool Enhanced with User Positions
Added optional `vaultAddress` parameter. When provided, calls `readYoTreasuryBalances()` to fetch ERC4626 share positions, then merges into vault data by matching `vault.contracts.vaultAddress.toLowerCase()`.

**Files changed**:
- `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` — vaultAddress param, position merge logic
- `packages/mastra/src/tools/yo-treasury/types.ts` — added `YoVaultUserPosition` type

### 4. Agent System Prompt Tuning (the hard problem)
The agent (Claude Haiku 4.5 via OpenRouter) kept duplicating tool output data in text responses — full markdown tables, bullet lists of APYs, etc.

**What didn't work**: System prompt changes alone. Even after adding "NEVER repeat data" and "NEVER use markdown", clearing the LibSQL memory DB, and restarting Mastra, Haiku still produced verbose markdown responses.

**What worked**: Putting the "don't repeat" directive directly in the tool output `message` field:
```typescript
message: `[UI rendered a table with ${vaultData.length} vaults — do NOT list or repeat vault data in text]`
```
Smaller models respond better to guidance placed right next to the data in tool results than to system prompt instructions alone.

Also added good/bad examples in the system prompt for reinforcement.

**Files changed**:
- `packages/mastra/src/agents/yo-treasury-agent.ts` — TONE & STYLE section with examples
- `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` — UI-rendered message
- `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts` — UI-rendered message

### 5. Verified Fix
Browser test confirmed: agent now responds with "Here are your yield options on Base." — one sentence, no markdown, no data duplication. Table renders correctly with all 5 vaults.

## Key Pattern Learned

**LLM tool output guidance > system prompt** for controlling response verbosity with smaller models. The `[UI rendered... — do NOT repeat]` pattern in tool `message` fields is more effective than system prompt instructions for Haiku-class models.

## Staged Changes Summary

6 files changed:
- `packages/mastra/src/agents/yo-treasury-agent.ts` — system prompt tuning
- `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts` — UI-rendered message
- `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` — user positions + UI-rendered message
- `packages/mastra/src/tools/yo-treasury/types.ts` — YoVaultUserPosition type
- `packages/web/src/yo-treasury/components/yo-vaults-list.tsx` — table layout rewrite
- `thoughts/kuba/tickets/fsn_0057-execute-next-step-yo-hackathon.md` — ticket file

No unstaged changes. Ready to commit.

## Next Steps (Priority Order)

### High Priority — Complete demo flow
1. **Test remaining agent actions in browser** — "Show my allocation", "Put 50 USDC in yoUSD", "Swap USDC to WETH". These tools exist but haven't been E2E tested with the current chat UI.
2. **Build TreasuryAllocation renderer** — The `treasury-balances` type exists but has no React component in `yo-tool-renderer.tsx`. Currently falls through to raw JSON.
3. **Deposit USDC into demo vault** — The demo vault (`0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D`) has 0 balance. Need real USDC deposited to test allocation/swap flows end-to-end.

### Medium Priority — Dashboard & forms
4. **Build PortfolioSummary + AllocationBreakdown** — Show treasury holdings without needing to chat. This is the "dashboard-first" requirement from the hackathon pitch.
5. **Build DepositForm + WithdrawForm** — Standard web UI deposit/withdraw (not chat-based).

### Lower Priority — Polish
6. **Multi-chain vault display** — yoGOLD and yoUSDT are on Ethereum mainnet. Currently shown in the table but positions can't be read cross-chain.
7. **Demo video script** — See `03-implementation-phases.md` Phase 5 for the 3-minute script.
8. **DoraHacks submission** — README, repo cleanup, video upload.

## How to Resume

```bash
cd packages/mastra && npx mastra dev    # Start Mastra agent server on :4111
cd packages/web && pnpm dev             # Start Next.js on :3000
# Navigate to: http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D/yo
```

Demo vault: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` (Base, chainId 8453)
Model: Claude Haiku 4.5 via OpenRouter (`openrouter/anthropic/claude-3-5-haiku-20241022`)
Memory: LibSQL at `packages/mastra/mastra.db` (auto-created on first request)
