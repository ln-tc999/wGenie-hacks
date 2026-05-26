import { mainnet } from 'viem/chains';

export const PEG_STABILITY_MODULE = {
  [mainnet.id]: '0x4809010926aec940b550D34a46A52739f996D75D',
} as const;

export const CREDIT_ENFORCER = {
  [mainnet.id]: '0x04716DB62C085D9e08050fcF6F7D775A03d07720',
} as const;

export const RUSD_SAVINGS_MODULE_ADDRESS = {
  [mainnet.id]: '0x5475611Dffb8ef4d697Ae39df9395513b6E947d7',
} as const;

export const RUSD_ADDRESS = {
  [mainnet.id]: '0x09D4214C03D01F49544C0448DBE3A27f768F2b34',
} as const;
