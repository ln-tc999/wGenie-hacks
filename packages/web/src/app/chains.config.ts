import { arbitrum, base, mainnet } from 'viem/chains';
import z from 'zod';

export const ALLOWED_CHAINS = [mainnet, arbitrum, base] as const;
export const ALLOWED_CHAIN_IDS = [mainnet.id, arbitrum.id, base.id] as const;

export type ChainId = (typeof ALLOWED_CHAIN_IDS)[number];

export const chainIdSchema = z.coerce.number().int().positive();

export const allowedChainIdsSchema = chainIdSchema
  .refine((val) => ALLOWED_CHAIN_IDS.includes(val as ChainId))
  .transform((val) => val as ChainId);

export function isValidChainId(chainId: number): chainId is ChainId {
  return ALLOWED_CHAIN_IDS.includes(chainId as ChainId);
}
