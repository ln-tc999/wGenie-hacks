import { addressSchema, hexSchema } from './utils/schema';
import { z } from 'zod';
import {
  arbitrum,
  base,
  mainnet,
  unichain,
  tac,
  ink,
  plasma,
  avalanche,
} from 'viem/chains';

const fuseActionSchema = z.object({
  fuse: addressSchema,
  data: hexSchema,
});

export type FuseAction = z.infer<typeof fuseActionSchema>;

const CHAINS = [
  mainnet,
  arbitrum,
  base,
  unichain,
  tac,
  ink,
  plasma,
  avalanche,
] as const;

export const CHAIN_IDS = CHAINS.map((chain) => chain.id);

export type ChainId = (typeof CHAIN_IDS)[number];
