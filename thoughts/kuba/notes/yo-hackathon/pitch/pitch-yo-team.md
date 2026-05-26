# YO Treasury — Pitch to YO Team

## What We're Building

A personal on-chain vault (wGenie Fusion PlasmaVault) that wraps YO vaults. Users deposit once, an AI copilot allocates across yoUSD/yoETH/yoBTC/yoEUR through conversation. Built-in swaps handle cross-asset routing (deposit USDC, get yoETH exposure). All real transactions, multi-chain (Base primary).

## Why YO Should Care

**YO becomes infrastructure, not just a product.** Every Treasury vault deployed is a new depositor into YO — more TVL, more volume, more gateway events. We interact via ERC4626 standard + `@yo-protocol/core` for all off-chain data.

**New user segments.** The current app serves passive depositors. Treasury opens two new channels:
- Active managers who want personalized allocation across multiple YO vaults
- DAOs/teams who need role-based access, multi-sig compatibility, and audit trails

**Multi-vault adoption.** Today a user wanting yoUSD + yoETH needs separate transactions. Treasury lets them deposit USDC once → swap + allocate atomically in one tx → instant exposure to the full YO suite.

## SDK Integration

We use `getVaultSnapshot`, `getVaultState`, `getVaultYieldHistory`, `getUserPosition`, `VAULTS` registry, `parseTokenAmount` — plus direct ERC4626 `deposit()`/`withdraw()` on YO vault contracts. This is among the deepest possible integrations.

## Demo (3 min)

1. Create personal Treasury vault on Base
2. "What yields can I earn?" → Agent shows live YO vault APYs
3. Deposit 100 USDC → Allocate to yoUSD
4. "Swap half to WETH and put it in yoETH" → Atomic swap + allocate, single tx
5. "Show my portfolio" → 50% yoUSD, 50% yoETH — all real, on-chain
