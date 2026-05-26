---
description: Run an adaptive Alpha Agent demo via Playwright MCP against Storybook chat UI. Reads live vault state, makes strategic rebalancing decisions, executes real transactions. For client demos.
model: opus
---

# Alpha Agent Demo

You are running an interactive demo of the wGenie Fusion Alpha Agent for a client presentation. You will use Playwright MCP to interact with the Alpha Agent chat UI in Storybook and demonstrate professional-grade vault portfolio management.

## Context

- **Storybook URL**: `http://localhost:6007/iframe.html?globals=&id=vault-details-vaultalpha--base-usdc-vault&viewMode=story`
- **Vault**: `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` on Base (chainId 8453)
- **Alpha account**: `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`
- **Caller address for simulation**: `0x35b4915b0fCA6097167fAa8340D3af3E51AA3841`

## Pre-requisites

Before starting, verify these are running:
1. Mastra dev server: `cd packages/mastra && pnpm dev` (port 4111)
2. Storybook: `cd packages/web && pnpm storybook` (port 6007)

If not running, start them as background tasks.

## Demo Flow

You are an autonomous Portfolio Manager conducting a demo. Adapt your actions based on REAL vault state — do NOT use hardcoded amounts or markets. The vault is live on-chain; balances change.

### Step 1: Navigate & Visual Check
1. Open the Storybook URL using Playwright MCP
2. Take a screenshot — verify light theme, chat input visible
3. Report to the user what you see

### Step 2: Portfolio Review
1. Type into the chat: "Review my current portfolio positions and allocations"
2. Wait for the agent response + tool output to render
3. Take a screenshot of the balances display
4. **Read and analyze the real data**: Note which protocols have positions (Aave V3, Morpho, Euler), what tokens, what USD values, what's unallocated
5. Report the portfolio state to the user

### Step 3: Strategic Rebalancing (Adaptive)
Based on the REAL portfolio state from Step 2, design a rebalancing strategy. Choose ONE of these patterns depending on what you see:

**If multiple markets have positions:**
- Withdraw a small amount from the largest position
- Supply it to the smallest position (diversification play)
- Narrative: "Rebalancing to reduce concentration risk"

**If most capital is in one protocol:**
- Withdraw a portion and split across 2 other protocols
- Narrative: "Diversifying across lending protocols to reduce single-protocol exposure"

**If there's significant unallocated capital:**
- Supply unallocated tokens to 2-3 different markets
- Narrative: "Deploying idle capital to maximize yield"

**If positions are already well-balanced:**
- Withdraw from one, supply to another (rotation)
- Narrative: "Rotating exposure from [A] to [B] based on current rate environment"

Use meaningful amounts that show clear balance changes in the UI — typically 0.10–0.50 USDC range. Avoid tiny amounts (0.001) that round to $0.00 in the display.

### Step 4: Execute Actions
1. Type into the chat the first action (e.g., "Supply 0.30 USDC to Morpho WETH/USDC market")
2. Wait for simulation result, take screenshot
3. Verify: simulation card shows, changed balances only (no $0.00 → $0.00), protocol icons with colored squares
4. Type the second action (e.g., "Supply 0.15 USDC to Euler Base USDC vault")
5. Wait for simulation, take screenshot
6. Continue until all planned actions are created
7. Type: "Execute all pending actions"
8. Wait for ExecuteActions component to render with the multi-step flow
9. Take screenshot of the execution flow
10. Click through the steps: "Switch to Base" button → wait for ALPHA_ROLE check → "Simulate Transaction" → "Execute Transaction"
11. The Storybook wallet auto-signs — wait for transaction confirmation
12. Take screenshot of the confirmed transaction with tx hash link

### Step 5: Post-Execution Verification
1. Type: "Show me the updated portfolio"
2. Wait for fresh balances
3. Take screenshot
4. Compare with Step 2 — confirm the rebalancing took effect
5. Report the before/after to the user

### Step 6: UX Quality Report
After the demo, report to the user:
- Did protocol icons render with colored backgrounds?
- Did market labels show descriptive names (Morpho: "COLLATERAL/LOAN", Euler: vault name)?
- Were unchanged balance rows hidden in simulation?
- Did tx hash link to block explorer?
- Was the agent professional in tone (no casual filler)?
- Any bugs, glitches, or UX issues noticed?

## Interaction Guidelines

- **Use Playwright MCP** (`browser_snapshot`, `browser_type`, `browser_click`, `browser_take_screenshot`) for all browser interactions
- **Type messages** into the chat input and press Enter to submit
- **Wait for responses** — do NOT use `browser_wait_for` with hardcoded delays. Instead, use `browser_snapshot` to poll for the response. The snapshot will show when new content (tool output, simulation card, buttons) has appeared.
- **Take screenshots** at key moments for the demo record
- **Be adaptive** — if a transaction fails or the agent gives unexpected output, adjust your approach rather than retrying the same thing
- **Report everything** back to the user — they're watching the demo and want commentary
- **ExecuteActions flow** — After clicking "Execute all pending actions", you must manually click through the UI steps: the Switch to Base button, then Simulate Transaction, then Execute Transaction. The Storybook wallet auto-signs but the buttons need clicking.
- **Use descriptive market names** — Refer to Euler markets by vault name (e.g., "Euler Base USDC vault") and Morpho markets by pair (e.g., "Morpho WETH/USDC market") for clearest results

## What to Look For (UX Checklist)

- [ ] Light theme active
- [ ] Protocol icons in colored rounded squares (Morpho blue, Aave dark purple, Euler dark)
- [ ] Market positions show labels (not just "USDC" but "WETH/USDC" for Morpho, vault names for Euler)
- [ ] Simulation hides unchanged rows
- [ ] Tx hash is a clickable link with copy button
- [ ] Agent uses professional PM language
- [ ] Agent uses human-readable numbers
- [ ] No console errors
- [ ] Execution completes successfully
