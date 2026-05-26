import { arbitrum, base, mainnet, plasma, unichain } from 'viem/chains';
import { z } from 'zod';

export const chains = [mainnet, arbitrum, base, unichain, plasma] as const;

export const chainIdSchema = z.union([
  z.literal(mainnet.id),
  z.literal(arbitrum.id),
  z.literal(base.id),
  z.literal(unichain.id),
  z.literal(plasma.id),
]);

export type ChainId = z.infer<typeof chainIdSchema>;
