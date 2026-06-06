import { arbitrum, avalanche, base, mainnet, mantle, mantleSepoliaTestnet, plasma, unichain } from 'viem/chains';
import { z } from 'zod';

export const chains = [mainnet, arbitrum, base, unichain, avalanche, plasma, mantle, mantleSepoliaTestnet] as const;

export const chainIdSchema = z.union([
  z.literal(mainnet.id),
  z.literal(arbitrum.id),
  z.literal(base.id),
  z.literal(unichain.id),
  z.literal(avalanche.id),
  z.literal(plasma.id),
  z.literal(mantle.id),
  z.literal(mantleSepoliaTestnet.id),
]);

export type ChainId = z.infer<typeof chainIdSchema>;
