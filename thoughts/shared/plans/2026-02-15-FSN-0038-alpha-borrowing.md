# FSN-0038: Alpha Agent Borrowing from Supported Markets

## Overview

Enable the Alpha Agent to effectively borrow assets from Aave V3 and Morpho markets. The SDK and Mastra tools already support `borrow()` and `repay()` for both protocols. This plan refines the agent instructions to provide borrowing-specific guidance and tests the full flow end-to-end in both Mastra Studio and the web app via Playwright MCP.

## Current State Analysis

**Already implemented:**
- SDK: `AaveV3.borrow()`, `AaveV3.repay()`, `Morpho.borrow()`, `Morpho.repay()` all exist
- Mastra tools: `createAaveV3ActionTool` and `createMorphoActionTool` both support `borrow` and `repay` action types
- `getMarketBalancesTool` already shows both supply and borrow positions per market
- Agent instructions list borrow/repay as capabilities for Aave V3 and Morpho
- `simulatePendingActionsTool` can simulate borrow actions
- `SimulationResult` component has full connect → chain switch → execute flow

**What's missing:**
- Agent instructions lack borrowing-specific workflow guidance (when to borrow, how repay works, relationship between supply/collateral and borrowing)
- No verification that borrowing actually works end-to-end (untested path)

### Key Discoveries:

- Aave V3 borrow fuse ABI enter struct: `{ asset: address, amount: uint256 }` — same as supply (`packages/sdk/src/markets/aave-v3/abi/aave-v3-borrow-fuse.abi.ts`)
- Morpho borrow fuse ABI enter struct: `{ morphoMarketId: bytes32, amountToBorrow: uint256, sharesToBorrow: uint256 }` — sharesToBorrow always passed as 0n (`packages/sdk/src/markets/morpho/Morpho.ts:67`)
- Euler V2 borrowing is explicitly out of scope per user request (requires collateral/controller fuse setup)
- `getMarketBalancesTool` output includes `borrowFormatted` and `borrowValueUsd` per market position — agent can see existing borrows

## Desired End State

1. Agent instructions include a **BORROWING** section explaining the borrow/repay workflow
2. Agent knows to check market balances before borrowing to verify existing positions
3. Agent can guide users through: check balances → borrow → show pending → simulate → execute
4. Full end-to-end flow tested in both Mastra Studio and web app via Playwright

### Verification:
- In Mastra Studio: Ask agent to borrow USDC from Aave V3 on a test vault → agent creates borrow action, stores in memory, can show and simulate
- In web app: Same flow with UI components rendering correctly

## What We're NOT Doing

- Euler V2 borrowing (requires collateral/controller fuse setup — skipped per user request)
- SDK changes (borrow/repay already implemented for Aave V3 and Morpho)
- Tool changes (already support borrow/repay action types)
- New React components (existing components handle borrow actions via `pending-actions-list` and `simulation-result`)

## Implementation Approach

1. Update agent instructions with borrowing-specific guidance
2. Test in Mastra Studio via Playwright
3. Test in web app via Playwright

---

## Phase 1: Update Agent Instructions for Borrowing

### Overview
Add a BORROWING section to the agent instructions explaining borrowing workflows, repayment, and how to use market balances to understand borrow positions.

### Changes Required:

#### 1. Update agent instructions

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Add borrowing-specific guidance to the instructions string

Add the following section after the existing `## TOKEN AMOUNTS` section:

```
## BORROWING & REPAYING

### Aave V3 Borrowing
- Use createAaveV3ActionTool with actionType: "borrow" to borrow an asset
- The vault must have collateral (supply) in Aave V3 before borrowing
- Call getMarketBalancesTool first to see existing supply positions — these serve as collateral
- To borrow, specify the asset address and amount (same parameters as supply)
- To repay, use actionType: "repay" with the same asset address and repay amount

### Morpho Borrowing
- Use createMorphoActionTool with actionType: "borrow" to borrow from a Morpho market
- Morpho markets are isolated — each market has its own collateral requirements
- The morphoMarketId (bytes32) identifies the specific lending/borrowing market
- Call getMarketBalancesTool to see existing Morpho positions (supply = lending, borrow = debt)
- To repay, use actionType: "repay" with the same morphoMarketId and repay amount

### Checking Borrow Positions
- getMarketBalancesTool shows both supply and borrow balances per market
- A position with non-zero borrowFormatted means the vault has outstanding debt
- totalValueUsd = supply value - borrow value (can be negative if borrow > supply collateral value)
```

Also update the `### Create Actions` section to emphasize borrow/repay:

Change from:
```
- **Aave V3**: supply, withdraw, borrow, repay (needs asset address + amount)
- **Morpho**: supply, withdraw, borrow, repay (needs Morpho market ID + amount)
```

To:
```
- **Aave V3**: supply, withdraw, **borrow**, **repay** (needs asset address + amount)
- **Morpho**: supply, withdraw, **borrow**, **repay** (needs Morpho market ID + amount)
```

(The markdown bold emphasizes borrow/repay as capabilities to the LLM.)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && pnpm tsc --noEmit`
- [ ] Mastra dev server starts: `cd packages/mastra && pnpm dev`

#### Manual Verification:
- [ ] Alpha agent visible in Mastra Studio with updated instructions

**Implementation Note**: After completing this phase, proceed to Phase 2.

---

## Phase 2: Test Borrowing in Mastra Studio via Playwright

### Overview
Use Playwright MCP to navigate to Mastra Studio and test the borrowing workflow with the Alpha Agent.

### Test Steps:

1. Start Mastra dev server: `cd packages/mastra && pnpm dev`
2. Navigate to `http://localhost:4111/agents/alpha-agent`
3. Test the following conversation flow:

**Test 1: Check market balances before borrowing**
- Send: "Check the market balances for vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 on chain 1"
- Verify: Agent calls `getMarketBalancesTool`, returns ERC20 tokens and market positions with supply/borrow fields

**Test 2: Create an Aave V3 borrow action**
- Send: "Borrow 100000000 of asset 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 from Aave V3 on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 on chain 1"
- Verify: Agent calls `createAaveV3ActionTool` with `actionType: 'borrow'`, stores action in working memory

**Test 3: Show pending actions**
- Send: "Show my pending actions"
- Verify: Agent calls `displayPendingActionsTool`, output shows the borrow action with `type: 'pending-actions'`

**Test 4: Simulate borrow actions**
- Send: "Simulate my pending actions with caller 0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6"
- Verify: Agent calls `simulatePendingActionsTool`, returns simulation result (may fail if vault doesn't have collateral, but the tool call itself should succeed)

**Test 5: Create a Morpho borrow action**
- Send: "Clear all actions"
- Then: "Borrow 100000000 from Morpho market 0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc on vault 0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2 chain 1"
- Verify: Agent calls `createMorphoActionTool` with `actionType: 'borrow'`

### Success Criteria:

#### Manual Verification:
- [ ] Agent correctly calls `createAaveV3ActionTool` with `actionType: 'borrow'`
- [ ] Agent correctly calls `createMorphoActionTool` with `actionType: 'borrow'`
- [ ] Agent stores borrow actions in working memory
- [ ] `displayPendingActionsTool` shows borrow actions correctly
- [ ] `simulatePendingActionsTool` executes without tool errors (simulation may revert on-chain, that's expected)
- [ ] Agent knows to check balances before borrowing when asked about borrowing strategy
- [ ] No console errors in Studio

**Implementation Note**: After verifying in Studio, proceed to Phase 3 for web app testing.

---

## Phase 3: Test Borrowing in Web App via Playwright

### Overview
Use Playwright MCP to navigate to the web app and test the borrowing workflow with custom UI rendering.

### Pre-requisites:
- Web app running: `cd packages/web && pnpm dev`
- Mastra running: `cd packages/mastra && pnpm dev`
- Authenticate with the web app (use fusion-dev-auth skill if needed)

### Test Steps:

1. Navigate to `http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/ask-ai`

**Test 1: Check vault balances**
- Type: "What are the vault's balances?"
- Submit message
- Verify: `MarketBalancesList` component renders with ERC20 tokens and market sections showing supply/borrow columns

**Test 2: Create a borrow action**
- Type: "Borrow 100000 USDC from Aave V3"
- Submit message
- Verify: Agent resolves USDC address from balances, calls SDK tool with borrow action type, updates working memory

**Test 3: Show pending borrow actions**
- Type: "Show my pending actions"
- Submit message
- Verify: `PendingActionsList` component renders showing the borrow action with correct description (e.g., "Aave V3 borrow...")

**Test 4: Simulate borrow**
- Type: "Simulate my pending actions with caller 0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6"
- Submit message
- Verify: `SimulationResult` component renders with success/failure status and execute button (if successful)

**Test 5: Repay action**
- Type: "Clear actions, then create a repay of 50000 USDC to Aave V3"
- Submit message
- Verify: Agent creates repay action (actionType: 'repay')

### Success Criteria:

#### Manual Verification:
- [ ] MarketBalancesList shows supply/borrow columns for market positions
- [ ] PendingActionsList renders borrow actions with correct descriptions
- [ ] SimulationResult renders for borrow simulation
- [ ] Agent correctly handles both borrow and repay action types
- [ ] UI components render without errors
- [ ] Chat messages flow correctly (text + tool outputs interleaved)
- [ ] No console errors

**Implementation Note**: After completing web app testing, the feature is complete.

---

## Testing Strategy

### Unit Tests:
- None needed — borrowing uses existing SDK methods and tool infrastructure

### Integration Tests:
- None added — the SDK `borrow()` and `repay()` methods were tested in Hardhat fork tests during FSN-0032

### Manual Testing Steps (via Playwright):
1. Studio: borrow via Aave V3 → verify tool call + working memory
2. Studio: borrow via Morpho → verify tool call + working memory
3. Studio: simulate borrow actions → verify simulation result
4. Web app: full flow → check balances → borrow → show pending → simulate
5. Web app: repay action → verify repay tool call

## Performance Considerations

- No new RPC calls — borrowing uses the same `PlasmaVault.create()` + `encodeFunctionData()` pattern as supply
- No additional latency compared to supply actions

## References

- Agent definition: `packages/mastra/src/agents/alpha-agent.ts`
- Aave V3 tool: `packages/mastra/src/tools/alpha/create-aave-v3-action.ts`
- Morpho tool: `packages/mastra/src/tools/alpha/create-morpho-action.ts`
- SDK AaveV3 class: `packages/sdk/src/markets/aave-v3/AaveV3.ts:69-95` (borrow/repay methods)
- SDK Morpho class: `packages/sdk/src/markets/morpho/Morpho.ts:65-91` (borrow/repay methods)
- Market balances tool: `packages/mastra/src/tools/alpha/get-market-balances.ts`
- Simulation tool: `packages/mastra/src/tools/alpha/simulate-pending-actions.ts`
- PendingActionsList: `packages/web/src/vault-details/components/pending-actions-list.tsx`
- SimulationResult: `packages/web/src/vault-details/components/simulation-result.tsx`
- MarketBalancesList: `packages/web/src/vault-details/components/market-balances-list.tsx`
