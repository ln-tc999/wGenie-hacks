# YO Treasury — Implementation Phases

## Adaptive Approach

This plan **will evolve during implementation**. We start with basics, execute, and adjust. Detailed tickets are created only for the very next step. If assumptions prove wrong, we change the plan. Implementation follows a bottom-up approach: bare code with automated tests first, then higher abstractions, UI last.

**Skills to use during implementation:**
- `fuse-explorer` — find right fuses code
- `mastra` — Mastra framework patterns
- `vercel-react-best-practices` — React/Next.js optimization
- `web-design-guidelines` — UI review
- `web3-data-fetching` — complex data fetching workflows
- `yo-protocol-cli` — ad-hoc vault queries
- `yo-protocol-sdk` — YO SDK integration
- `test-driven-development` — TDD where possible

**SDK-first rule**: Before implementing any custom function, check `@wgenie/fusion-sdk` and `@yo-protocol/core` for existing utilities (e.g., `substrateToAddress`, `PlasmaVault.getMarketSubstrates`, `MARKET_ID` constants, `ACCESS_MANAGER_ROLE`).

---

## Screenshots

All screenshots created during development go to: `thoughts/kuba/notes/yo-hackathon/screenshots/`
Do NOT create screenshots at repository root level.

---

## Phase 1: Smart Contract Setup & Vault Creation

> **STATUS: DONE** (FSN-0044, FSN-0045)
> Implemented in `packages/sdk/src/markets/yo/` (not `packages/web/` as originally planned).
> Fork tests at `packages/hardhat-tests/test/yo-treasury/create-vault.ts` — all 5 pass.
> See: `thoughts/shared/plans/2026-02-28-FSN-0044-yo-treasury-foundation.md`
> See: `thoughts/shared/plans/2026-02-28-FSN-0045-yo-withdraw-swap-allocate.md`

### Overview
~~Set up the on-chain infrastructure. Create vault creation utilities within `packages/web/src/yo-treasury/` that will be used by the frontend onboarding flow.~~

**Actual implementation**: SDK market module at `packages/sdk/src/markets/yo/` with ABIs, address constants, role constants, and vault creation library. Fork tests at `packages/hardhat-tests/test/yo-treasury/`. Constants and ABIs are exported from `@wgenie/fusion-sdk`, not from `packages/web/`.

### Implementation Order (Actual)
1. ~~Address constants and ABIs in `packages/web/src/yo-treasury/constants/`~~
   → Implemented in `packages/sdk/src/markets/yo/` as a proper SDK market module
2. ~~Vault creation tx builders in `packages/web/src/yo-treasury/lib/`~~
   → Implemented in `packages/sdk/src/markets/yo/create-vault.ts`
3. Fork tests → `packages/hardhat-tests/test/yo-treasury/create-vault.ts`
4. ✓ Phase 1 complete

### Changes Required

#### 1. Vault Creation Utilities

**File**: `packages/web/src/yo-treasury/lib/create-vault.ts` (new)

Vault creation logic used by the frontend onboarding flow (CreateVaultFlow component). Exported as pure functions that return transaction configs — the UI calls them via wagmi hooks.

```typescript
// 1. Clone vault from factory
const tx1 = await walletClient.writeContract({
  address: FUSION_VAULT_FACTORY_ADDRESS[8453], // Base
  abi: fusionFactoryAbi,
  functionName: 'clone',
  args: ['YO Treasury', 'yoTRSY', USDC_BASE, 1n, ownerAddress, 0n],
})
// Parse PlasmaVaultCreated event → vaultAddress, accessManagerAddress

// 2. Grant roles to owner (including WHITELIST_ROLE for deposit access)
for (const role of [ATOMIST_ROLE, FUSE_MANAGER_ROLE, ALPHA_ROLE, WHITELIST_ROLE]) {
  await walletClient.writeContract({
    address: accessManagerAddress,
    abi: accessManagerAbi,
    functionName: 'grantRole',
    args: [role, ownerAddress, 0],
  })
}
// NOTE: No convertToPublicVault() — vault stays non-public.
// WHITELIST_ROLE (800) grants deposit access to the user's wallet only.

// 3. Add fuses
await walletClient.writeContract({
  address: vaultAddress,
  abi: plasmaVaultAbi,
  functionName: 'addFuses',
  args: [[
    ERC4626_SUPPLY_FUSE_SLOT1_BASE,  // for yoUSD
    ERC4626_SUPPLY_FUSE_SLOT2_BASE,  // for yoETH
    ERC4626_SUPPLY_FUSE_SLOT3_BASE,  // for yoBTC
    ERC4626_SUPPLY_FUSE_SLOT4_BASE,  // for yoEUR
    UNIVERSAL_TOKEN_SWAPPER_FUSE_BASE,
  ]],
})

// 4. Add balance fuses (one per ERC4626 market)
for (const { marketId, balanceFuse } of erc4626Markets) {
  await walletClient.writeContract({
    address: vaultAddress,
    abi: plasmaVaultAbi,
    functionName: 'addBalanceFuse',
    args: [marketId, balanceFuse],
  })
}

// 5. Whitelist YO vault addresses as substrates
// Use substrateToAddress from @wgenie/fusion-sdk for the inverse (pad)
await walletClient.writeContract({
  address: vaultAddress,
  abi: plasmaVaultAbi,
  functionName: 'grantMarketSubstrates',
  args: [ERC4626_0001_MARKET_ID, [pad(YO_USD_BASE, { size: 32 })]],
})
// ... repeat for yoETH, yoBTC, yoEUR

// 6. Whitelist swap tokens + routers as substrates
await walletClient.writeContract({
  address: vaultAddress,
  abi: plasmaVaultAbi,
  functionName: 'grantMarketSubstrates',
  args: [SWAP_MARKET_ID, [
    pad(USDC_BASE, { size: 32 }),
    pad(WETH_BASE, { size: 32 }),
    pad(CBBTC_BASE, { size: 32 }),
    pad(EURC_BASE, { size: 32 }),
    pad(ODOS_ROUTER_BASE, { size: 32 }),
    pad(KYBERSWAP_ROUTER_BASE, { size: 32 }),
    // Velora router TBD
  ]],
})

// 7. Set dependency balance graphs
await walletClient.writeContract({
  address: vaultAddress,
  abi: plasmaVaultAbi,
  functionName: 'updateDependencyBalanceGraphs',
  args: [[100001n, 100002n, 100003n, 100004n], [[], [], [], []]],
})
```

#### 2. Address Constants

**File**: `packages/web/src/yo-treasury/constants/addresses.ts` (new)

Central registry of all contract addresses per chain:
- FusionFactory addresses (Base, Ethereum, Arbitrum)
- ERC4626SupplyFuse addresses per slot per chain
- ERC4626BalanceFuse addresses per slot per chain
- UniversalTokenSwapperFuse addresses per chain
- YO vault addresses per chain
- Token addresses per chain (USDC, WETH, cbBTC, EURC)
- Swap router addresses per chain (Odos, KyberSwap, Velora TBD)

#### 3. ABIs

**File**: `packages/web/src/yo-treasury/constants/abis.ts` (new)

Collect needed ABIs (check `@wgenie/fusion-sdk` exports first — many already exist):
- `fusionFactoryAbi` (clone function)
- `plasmaVaultFactoryAbi` (PlasmaVaultCreated event)
- `accessManagerAbi` (grantRole) — available from `@wgenie/fusion-sdk`
- `plasmaVaultAbi` (addFuses, addBalanceFuse, grantMarketSubstrates, updateDependencyBalanceGraphs, execute, deposit, withdraw) — available from `@wgenie/fusion-sdk`
- `erc4626SupplyFuseAbi` (enter, exit) — may need to extract from Solidity
- `universalTokenSwapperFuseAbi` (enter) — may need to extract from Solidity

Use `generate-fuse-abis` skill if needed.

### Testing Strategy

**Fork tests (Hardhat)**: Reference existing pattern in `packages/hardhat-tests/`:
- Pin to a specific Base block number for deterministic results
- Test vault creation, role granting, fuse installation, substrate configuration
- Test deposit (with WHITELIST_ROLE), allocation to yoUSD, swap, withdrawal
- Private keys from Hardhat test accounts only — NEVER in production code

```typescript
// Fork test pattern (from packages/hardhat-tests/)
connection = await network.connect({
  network: 'hardhatBase',
  chainType: 'op',
  override: {
    chainId: base.id,
    forking: { url: env.RPC_URL_BASE, blockNumber: BLOCK_NUMBER },
  },
});
```

### Success Criteria (Actual Results)

#### Automated Verification:
- [x] Fork tests pass — 5/5 tests pass on Base fork at block 42755236
- [x] Vault created with correct underlying (USDC) ✓
- [x] All roles granted including WHITELIST_ROLE=800 ✓
- [x] All fuses installed (4 ERC4626Supply + UniversalTokenSwapper) ✓
- [x] Deposit into vault works (100 USDC with WHITELIST_ROLE) ✓
- [x] PlasmaVault.execute with Erc4626SupplyFuse.enter(yoUSD) ✓
- [x] PlasmaVault.execute with UniversalTokenSwapperFuse.enter (USDC→WETH via Uniswap V3) ✓
- [x] Withdrawal from yoUSD via impersonated redeem() ✓ (Erc4626SupplyFuse.exit fails — YoVault.withdraw() is disabled)
- [x] Compound swap+allocate in single execute() call ✓
- [x] TypeScript compiles ✓

#### Issues Found & Resolved:
- ~~Erc4626SupplyFuse.exit() does NOT work with YO vaults (withdraw() is disabled)~~ → **FIXED**: Created `YoRedeemFuse` (`packages/hardhat-tests/contracts/YoRedeemFuse.sol`) — calls `redeem()` instead of `withdraw()`. ABI exported as `yoRedeemFuseAbi` from `@wgenie/fusion-sdk`. Fork test deploys + registers it dynamically and proves withdrawal works through the fuse system (no impersonation). See `thoughts/kuba/notes/yo-hackathon/plans/yo-redeem-fuse.md`.
- ZeroBalanceFuse needed for swap market — test uses bytecode hack, production needs deployment
- SDK library functions untested (test does everything inline) — being fixed in FSN-0046a
- **YoRedeemFuse not yet deployed to Base** — only needed when executing real transactions in the web app (Phase 3). Deploy as late as possible.

**Implementation Note**: Phase 1 complete. Follow-up items tracked in FSN-0046a/b/c.

---

## Phase 2: AI Agent (Mastra)

### Overview
Build the `yo-treasury-agent` with tools that read YO vault data, read Fusion vault allocation, create allocation/withdrawal/swap actions, simulate on Tenderly fork, and pass to UI for execution. Agent handles alpha actions only — NOT deposit/withdraw from treasury.

> **STATUS: DONE** — All tools implemented and tested e2e. Simulation migrated from Anvil to Tenderly Virtual TestNet (FSN-0087). Agent has 4 tools (consolidated from original 8 — see architecture doc). All flows tested on Base mainnet: allocate, withdraw, swap, swap+allocate batch.

### Implementation Order
1. Tool types and output schemas
2. Read-only tools (getYoVaults, getYoVaultDetails, getTreasuryAllocation)
3. Action tools (createAllocation, createWithdraw, createSwap)
4. Reuse displayPendingActions + executePendingActions
5. Agent definition with system prompt
6. Register agent in mastra/index.ts
7. Test each tool individually, then integration

### Changes Required

#### 1. Agent Definition

**File**: `packages/mastra/src/agents/yo-treasury-agent.ts` (new)

```typescript
import { Agent } from '@mastra/core/agent'
// ... imports

const yoTreasuryWorkingMemorySchema = z.object({
  pendingActions: z.array(pendingActionSchema).default([]),
})

export const yoTreasuryAgent = new Agent({
  id: 'yo-treasury-agent',
  model: env.MODEL,
  instructions: `You are a personal treasury alpha copilot...`, // detailed system prompt
  tools: {
    getYoVaultsTool,
    getYoVaultDetailsTool,
    getTreasuryAllocationTool,
    createAllocationActionTool,
    createWithdrawActionTool,
    createSwapActionTool,
    displayPendingActionsTool,
    executePendingActionsTool,
  },
})
```

System prompt includes:
- Role: Alpha advisor for a Fusion vault — you manage allocations across YO vaults
- You do NOT handle deposits into or withdrawals from the treasury (that's the web UI)
- Available vaults by chain with current addresses
- How to read vault state (getYoVaults → allocation → suggest)
- Swap instructions: always swap before allocating cross-asset
- Action workflow: read → plan → create actions (with simulation) → display → execute
- Working memory rules (same as alpha agent)
- Always use tools, never describe tool output in text
- Never project future yield — only display current APRs

#### 2. YO Vault Data Tools

**File**: `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts` (new)

```typescript
// Uses @yo-protocol/core
import { createYoClient } from '@yo-protocol/core'

export const getYoVaultsTool = createTool({
  id: 'getYoVaults',
  inputSchema: z.object({ chainId: z.number() }),
  execute: async ({ context }) => {
    const client = createYoClient({ chainId: context.chainId })
    const vaults = client.getVaults()
    const snapshots = await Promise.all(
      vaults.map(v => client.getVaultSnapshot(v.address))
    )
    return {
      type: 'yo-vaults' as const,
      vaults: vaults.map((v, i) => ({
        id: v.id, name: v.name, address: v.address,
        underlying: v.underlying.symbol,
        apy7d: snapshots[i]?.stats?.yield?.['7d'],
        tvl: snapshots[i]?.stats?.tvl?.formatted,
        yieldSources: snapshots[i]?.stats?.yieldSources,
      })),
    }
  },
})
```

**File**: `packages/mastra/src/tools/yo-treasury/get-yo-vault-details.ts` (new)

Deep dive tool using `getVaultState()` + `getVaultSnapshot()` + `getVaultYieldHistory()`.

#### 3. Treasury Allocation Tool

**File**: `packages/mastra/src/tools/yo-treasury/get-treasury-allocation.ts` (new)

Reads the Fusion vault's market balances using `@wgenie/fusion-sdk`:
- Use `PlasmaVault.create(publicClient, vaultAddress)` then `getMarketSubstrates()` for each ERC4626 market
- ERC20 substrates (unallocated tokens)
- Per-market positions (ERC4626 markets → YO vault share positions)
- Converts to USD values using price oracle

Returns `type: 'treasury-allocation'` with:
```typescript
{
  unallocated: { token, balance, usdValue }[],
  allocations: { yoVault, shares, assetValue, usdValue, apy }[],
  totalUsdValue: string,
}
```

#### 4. Allocation Action Tool

**File**: `packages/mastra/src/tools/yo-treasury/create-allocation-action.ts` (new)

Creates Erc4626SupplyFuse.enter FuseAction:
```typescript
const fuseAction = {
  fuse: ERC4626_SUPPLY_FUSE_ADDRESS[marketSlot][chainId],
  data: encodeFunctionData({
    abi: erc4626SupplyFuseAbi,
    functionName: 'enter',
    args: [{ vault: yoVaultAddress, vaultAssetAmount: amount }],
  }),
}
```

Includes Tenderly fork simulation (reuse `simulateOnFork` from alpha tools — migrated from Anvil to Tenderly).

#### 5. Withdrawal Action Tool

**File**: `packages/mastra/src/tools/yo-treasury/create-withdraw-action.ts` (new)

Creates YoRedeemFuse.exit FuseAction (NOT Erc4626SupplyFuse.exit — YoVault.withdraw() is disabled).
Uses `yoRedeemFuseAbi` from `@wgenie/fusion-sdk`. Share-denominated — reads vault's yoVault share
balance and passes it to `exit({ vault, shares })`.

#### 6. Swap Action Tool

**File**: `packages/mastra/src/tools/yo-treasury/create-swap-action.ts` (new)

Most complex tool — calls swap aggregator API then encodes UniversalTokenSwapperFuse.enter.

#### 7. Reuse Existing Tools

Copy and adapt from alpha tools:
- `displayPendingActionsTool` — reuse as-is
- `executePendingActionsTool` — reuse as-is
- `simulateOnFork` — reuse as-is

#### 8. Register Agent

**File**: `packages/mastra/src/mastra/index.ts` (modify)

Add `yoTreasuryAgent` to the Mastra instance agents map.

### Testing Strategy

- **Unit tests**: Test each tool individually with mocked data
- **Fork tests**: Test action tools against Hardhat fork (reuse Phase 1 vault)
- **Mastra Studio**: Manual testing of agent conversation flow
- **Test scripts**: Create automated test scripts for agent tools
- **Test prompts**: Create slash command prompts for non-deterministic agent testing

### Success Criteria

#### Automated Verification:
- [x] Agent instantiates without errors
- [x] `readTreasuryBalancesTool` reads a test vault's balances (renamed from `getTreasuryAllocationTool`)
- [x] `createYoAllocationActionTool` generates valid FuseAction calldata
- [x] `createYoSwapActionTool` calls Odos API and returns valid swap calldata
- [x] Tenderly simulation works for allocation actions (migrated from Anvil — FSN-0087)
- [x] TypeScript compiles: `pnpm tsc --noEmit`

#### Manual Verification:
- [x] Chat with agent in Mastra Studio — agent uses tools correctly
- [x] Agent responds naturally to "What are my yield options?"
- [x] Agent creates correct allocation actions when asked
- [x] Agent does NOT try to handle deposit/withdraw from treasury

**Implementation Note**: Phase 2 complete. All tools tested e2e on Base mainnet.

---

## Phase 3: Frontend — Onboarding & Dashboard

> **STATUS: DONE** (except ChainSelector + FirstDepositPrompt — stretch goals)
> - Vault creation page at `/yo-treasury/create` — decomposed into 6 per-step wagmi components (FSN-0055)
> - Demo vault deployed on Base: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` (block 43046896)
> - All pre-requisite deployments complete (YoRedeemFuse x4, ZeroBalanceFuse)
> - Added to `plasma-vaults.json` as "YO Treasury"
> - Deposit form (FSN-0058): approve + deposit, USD pricing via on-chain oracle
> - Withdraw form (FSN-0059): redeem flow, isMax flag, delayed refetch for stale RPC
> - Code review fixes (FSN-0063): extracted `useVaultReads`, oracle pricing, deduplication, mobile responsive
> - Dashboard (FSN-0063): `useTreasuryPositions` (wagmi multicall), `useYoVaultsData` (`@yo-protocol/core` v1.0.7), PortfolioSummary, AllocationTable, TreasuryDashboard — dashboard-first layout
> - YO brand theming: Space Grotesk font, neon green accent, vault colors, `--font-yo` in Tailwind v4 `@theme inline`
> - Verified in both Storybook and Next.js app with live data

### Overview
Build the onboarding flow (vault creation + first deposit) and the always-visible portfolio dashboard. Dashboard is the primary user experience. Implementation order: data hooks → dashboard components → onboarding flow → then UI integration.

### Implementation Order
1. Data hooks (useVaultBalances, useYoVaultData)
2. Dashboard components (PortfolioSummary, AllocationBreakdown)
3. Deposit/Withdraw forms (standard web UI)
4. Vault creation stepper
5. First deposit prompt
6. Page routing and layout

### Changes Required

#### 1. YO Treasury Page

**File**: `packages/web/src/app/yo-treasury/page.tsx` (new)

Entry point that checks state and renders appropriate view:
- If no vault → render `<CreateVaultFlow />`
- If vault exists but zero balance → render `<FirstDepositPrompt />`
- If vault exists with balance → render `<TreasuryDashboard />` with `<TreasuryChat />` as secondary tab

#### 2. Portfolio Dashboard (Primary View)

**File**: `packages/web/src/yo-treasury/components/treasury-dashboard.tsx` (new)

Always-visible dashboard showing:
- Total treasury value in USD
- Unallocated USDC balance
- Per-YO-vault positions (shares, asset value, % of total, current APR)
- YO vault APRs and TVL overview
- Deposit and withdraw forms (inline or accessible via buttons)

Data sourced from:
- `@wgenie/fusion-sdk` `PlasmaVault` for on-chain vault balances
- `@yo-protocol/core` for YO vault snapshots (APR, TVL)

#### 3. Deposit Form (Web UI)

**File**: `packages/web/src/yo-treasury/components/deposit-form.tsx` (new)

Standard form:
- Amount input (USDC)
- Approve + Deposit transaction flow using wagmi hooks
- User needs WHITELIST_ROLE (granted during vault creation)
- Not handled by AI chat

#### 4. Withdraw Form (Web UI)

**File**: `packages/web/src/yo-treasury/components/withdraw-form.tsx` (new)

Standard form:
- Amount input (USDC — unallocated balance only)
- PlasmaVault.withdraw() using wagmi hooks
- Not handled by AI chat

#### 5. Create Vault Flow

**File**: `packages/web/src/yo-treasury/components/create-vault-flow.tsx` (new)

Multi-step stepper:
- Step 1: Select chain (Base recommended)
- Step 2: Confirm vault creation → FusionFactory.clone()
- Step 3: Configure vault → Grant roles (incl. WHITELIST_ROLE) + Add fuses (incl. YoRedeemFuse) + Configure substrates
- Step 4: Ready! → Navigate to first deposit prompt

**No `convertToPublicVault` step.**

**Pre-requisite: DONE** — YoRedeemFuse (4 instances) and ZeroBalanceFuse deployed to Base. Vault creation page fully functional with per-step UX (FSN-0055).

#### 6. First Deposit Prompt

**File**: `packages/web/src/yo-treasury/components/first-deposit-prompt.tsx` (new)

Shown after vault creation or when returning user has zero balance:
- Explains that funds are needed before management
- USDC deposit form (same as deposit-form.tsx)
- After successful deposit → navigate to dashboard

### Testing Strategy

- **Playwright MCP**: Test full onboarding flow, deposit, dashboard rendering
- **Component tests**: Test individual components with mocked data
- **wagmi test utils**: Test transaction flows

### Success Criteria

#### Automated Verification:
- [x] Page renders at `/vaults/[chainId]/[address]/yo` (integrated into existing vault detail page)
- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [x] Build succeeds (Storybook + Next.js)

#### Manual Verification:
- [x] Connect wallet on Base
- [x] Walk through vault creation — all 17 transactions succeed (FSN-0055)
- [ ] First deposit prompt appears after creation — stretch goal
- [x] After deposit, dashboard shows correct balances
- [x] Dashboard always visible — no need to chat to see holdings
- [x] Deposit form works (approve + deposit) — tested e2e in Storybook
- [x] Withdraw form works (partial + max) — tested e2e in Storybook
- [x] Dashboard shows live APR/TVL from `@yo-protocol/core` — verified in Next.js app
- [x] Mobile responsive layout verified via Playwright

**Implementation Note**: Phase 3 complete. ChainSelector and FirstDepositPrompt deferred as stretch goals.

---

## Phase 4: Frontend — Chat UI & Tool Renderers

> **STATUS: DONE** — Chat UI, tool renderers, and all alpha action flows tested e2e on Base mainnet. All 4 YO vaults allocated via chat copilot. Unified `TransactionProposal` renderer handles allocations, withdrawals, and swaps (no separate `TreasuryAllocation` or `SwapPreview` components needed). Dashboard refreshes after chat-initiated transactions.

### Overview
Build the chat interface for alpha actions. This is the secondary view — users can allocate to YO vaults, swap assets, and manage positions through conversation. Reuse the vault-alpha.tsx streaming chat pattern with new YO-specific tool renderers.

### Implementation Order
1. API route
2. Tool type definitions
3. Chat component (reuse useChat pattern)
4. Tool renderers (one at a time, testing each)
5. Integration with dashboard layout

### Changes Required

#### 1. API Route

**File**: `packages/web/src/app/api/yo/treasury/chat/route.ts` (new)

Same pattern as alpha chat route:
- Validate chainId, vaultAddress
- Read { messages, callerAddress, vaultAddress, chainId } from body
- Build vault context string with vault address and chain
- Stream yoTreasuryAgent.stream(messages, { maxSteps: 5 })

#### 2. Treasury Chat Component

**File**: `packages/web/src/yo-treasury/components/treasury-chat.tsx` (new)

Based on `vault-alpha.tsx` pattern:
```typescript
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: `/api/yo/treasury/chat`,
    body: {
      callerAddress: walletAddress,
      vaultAddress: treasuryVaultAddress,
      chainId,
    },
  }),
})
```

#### 3. Tool Renderer

**File**: `packages/web/src/yo-treasury/components/yo-tool-renderer.tsx` (new)

Switch on `typed.type`:
```typescript
case 'yo-vaults': return <YoVaultsList vaults={typed.vaults} />
case 'yo-vault-details': return <YoVaultDetail vault={typed.vault} />
case 'treasury-allocation': return <TreasuryAllocation data={typed} />
case 'action-with-simulation': return <ActionWithSimulation ... /> // reuse existing
case 'pending-actions': return <PendingActionsList ... /> // reuse existing
case 'execute-actions': return <ExecuteActions ... /> // reuse existing
```

#### 4. New Tool Renderer Components

**File**: `packages/web/src/yo-treasury/components/yo-vaults-list.tsx` (new)

Card grid showing YO vaults: name, APY, TVL, underlying.

**File**: `packages/web/src/yo-treasury/components/treasury-allocation.tsx` (new)

Allocation breakdown (chat inline version of dashboard data).

**File**: `packages/web/src/yo-treasury/components/swap-preview.tsx` (new)

Swap route visualization.

#### 5. Type Definitions

**File**: `packages/mastra/src/tools/yo-treasury/types.ts` (new)

Discriminated union for all tool outputs.

### Testing Strategy

- **Playwright MCP**: Test full chat flow, tool rendering, transaction execution
- **Mastra Studio**: Test agent responses and tool usage
- **Test prompts**: Slash commands for common agent scenarios

### Success Criteria

#### Automated Verification:
- [x] TypeScript compiles: `pnpm tsc --noEmit`
- [x] Build succeeds: `pnpm build`
- [x] API route responds to POST with streaming

#### Manual Verification:
- [x] Chat loads with treasury context
- [x] "What are my yield options?" → Shows YO vault table with live APR/TVL data
- [x] "Show my allocation" → Shows treasury breakdown (unallocated + YO positions)
- [x] "Allocate USDC to yoUSD" → Creates action, shows simulation, signs tx — confirmed on Base
- [x] "Swap USDC to WETH" → Odos quote+assemble → simulation → execute — confirmed on Base
- [x] "Swap and allocate to yoETH" → Batched swap+allocate in single tx — confirmed on Base
- [x] Agent does NOT try to handle deposit/withdraw from treasury
- [x] Transaction execution works end-to-end (all 4 YO vaults allocated)
- [x] Dashboard updates after chat-initiated transactions (invalidateQueries + 2s delayed retry)

**Implementation Note**: Phase 4 complete. All flows tested e2e on Base mainnet.

---

## Phase 5: Polish, Demo & Submission

> **STATUS: IN PROGRESS** — App deployed to Vercel, Mastra deployed to Vercel, README written, simulation migrated to Tenderly, voiceover script drafted. Video recording and DoraHacks submission remaining.

### Overview
Polish the UX, record the demo video, prepare GitHub submission.

### Changes Required

#### 1. Branding & Styling
- Clean color scheme (differentiate from YO's black/neon green)
- Treasury-specific iconography
- Loading states and transitions
- Error handling and user-friendly error messages
- Mobile responsive layout

#### 2. Demo Script (3 minutes)

```
(0:00-0:15) Open app. "Meet YO Treasury — your personal AI-managed yield vault."
            Show the dashboard-first design. "Your holdings are always visible."

(0:15-0:40) "Create your Treasury." Walk through vault creation.
            Show WHITELIST_ROLE being granted. "Your vault, your rules."

(0:40-1:00) First deposit: 100 USDC via the deposit form.
            Dashboard immediately shows: "100 USDC unallocated."

(1:00-1:30) Switch to chat. "What yields can I earn?"
            Agent shows YO vaults: yoUSD at 19%, yoETH at 17%.
            "This is real-time data from @yo-protocol/core."

(1:30-2:00) "Allocate 50 USDC to yoUSD."
            Agent creates action, simulates, shows diff.
            Sign PlasmaVault.execute(). Dashboard updates instantly.

(2:00-2:30) "Swap 30 USDC to WETH and put it in yoETH."
            Agent calls Odos API, batches swap + allocate.
            Single tx. Dashboard now shows: 20 USDC unallocated, 50 in yoUSD, 30 in yoETH.

(2:30-2:50) Back to dashboard. "Everything is always visible."
            Show allocations, APRs, total value.
            "DeFi savings with full transparency."

(2:50-3:00) "This is YO Treasury. Dashboard-first. AI-powered. Your funds, your vault."
```

#### 3. Submission Package
- GitHub repo (clean, well-documented README)
- 3-minute demo video
- Clear explanation of YO SDK usage
- Architecture diagram in README

### Success Criteria

#### Automated Verification:
- [x] App builds clean: `pnpm build`
- [x] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] No lint errors: `pnpm lint`
- [ ] All fork tests pass

#### Manual Verification:
- [ ] Full demo script executes without errors
- [ ] Demo video recorded and under 3 minutes
- [x] README clearly explains the project (commit `b5cf48c`)
- [ ] GitHub repo is public and clean
- [x] Dashboard is always visible and accurate
- [x] Chat handles alpha actions smoothly
