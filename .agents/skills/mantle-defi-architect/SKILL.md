---
name: mantle-defi-architect
description: Comprehensive architect guide for Mantle DeFi protocols (Aave V3, Merchant Moe, Agni, WalletGenie Treasury). Use when Gemini CLI needs to architect complex on-chain strategies, generate calldata for swaps or lending, or reference protocol-specific addresses and ABIs on Mantle Network.
---

# Mantle DeFi Architect

Specialized guide for building and executing strategies on Mantle Network.

## Quick References
- **Aave V3**: Lending and yield generation. See [aave-v3.md](references/aave-v3.md).
- **Merchant Moe**: Concentrated liquidity swaps. See [merchant-moe.md](references/merchant-moe.md).
- **WalletGenie Treasury**: Execution hub. See [treasury.md](references/treasury.md).

## Transaction Patterns

### ERC20 Approval -> Aave Supply
When the treasury needs to deposit an ERC20 (like USDC) into Aave:
1. Generate `approve(pool, amount)` calldata for the token.
2. Propose `treasury.execute(token, 0, approvalData)`.
3. Generate `supply(asset, amount, treasury, 0)` calldata for the Aave pool.
4. Propose `treasury.execute(pool, 0, supplyData)`.

### Swap native MNT -> USDC (Merchant Moe)
1. Use `getWNATIVE()` on router to find wrapping address if needed.
2. Generate `swapExactNATIVEForTokens` calldata.
3. Propose `treasury.execute(router, amountIn, swapData)`.

## Integration with WalletGenie Monorepo
- Tools are located in `packages/mastra/src/tools/wgenie-cfo/`.
- UI Proposal cards are rendered in `packages/web/src/wgenie-cfo/components/treasury-transaction-proposal.tsx`.
- Chain configuration is in `packages/web/src/app/chains.config.ts`.
