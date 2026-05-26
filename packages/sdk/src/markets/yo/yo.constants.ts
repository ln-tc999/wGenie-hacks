import { ERC4626_MARKET_ID, MARKET_ID } from '../market-id';

// Access Manager role values (raw bigint)
// Source: packages/sdk/src/access-manager/access-manager.types.ts
export const YO_TREASURY_ROLES = {
  OWNER: 1n,
  ATOMIST: 100n,
  ALPHA: 200n,
  FUSE_MANAGER: 300n,
  WHITELIST: 800n,
} as const;

// Slot-to-market-ID mapping for YO vaults
export const YO_VAULT_SLOTS = {
  yoUSD: { slot: 1, marketId: ERC4626_MARKET_ID.ERC4626_0001 },
  yoETH: { slot: 2, marketId: ERC4626_MARKET_ID.ERC4626_0002 },
  yoBTC: { slot: 3, marketId: ERC4626_MARKET_ID.ERC4626_0003 },
  yoEUR: { slot: 4, marketId: ERC4626_MARKET_ID.ERC4626_0004 },
} as const;

export const SWAP_MARKET_ID = MARKET_ID.UNIVERSAL_TOKEN_SWAPPER;
