# YO Treasury — Pitch to wGenie Fusion Team

## What We're Building

Taking Fusion to the YO SDK Hackathon. Each user gets a PlasmaVault on Base that allocates across YO Protocol yield vaults via Erc4626SupplyFuse, swaps assets via UniversalTokenSwapperFuse, and is managed by an AI copilot (Alpha Agent pattern extended to external yield).

## Why Fusion Team Should Care

**Fusion as a platform — not just wGenie's internal tooling.** This is the first time a Fusion vault wraps a third-party yield protocol in a consumer-facing product. YO vaults are just the first example — the same pattern works for any ERC4626 source (Morpho vaults, Yearn, Ethena, Pendle).

**Components that get showcased:**
- `FusionFactory.clone()` — self-service consumer deployment (first time)
- `Erc4626SupplyFuse` — the generic fuse finally gets its moment, 4 market slots active
- `UniversalTokenSwapperFuse` — cross-asset routing via Odos/KyberSwap before allocation
- `PlasmaVault.execute()` — atomic batch: swap + allocate in one tx
- `wGenieFusionAccessManager` — full role stack on user's wallet
- Alpha Agent pattern — proven protocol-agnostic (YO fuses instead of Aave/Morpho)

**Replicable pattern.** "Personal vault as a service" — Fusion as the universal chassis, any ERC4626 yield source as the engine, AI as the driver. Win the hackathon, then pitch the same architecture to every yield protocol.

## What We Need

1. Are ERC4626 market slots 1-4 free for arbitrary use on Base?
2. Does Base PriceOracleMiddleware already support USDC, WETH, cbBTC, EURC?
3. Any known issues with Erc4626SupplyFuse + vaults that have async redemptions (YO queues redeems up to 24h)?
4. If we win, co-announce with "built on wGenie Fusion"?
