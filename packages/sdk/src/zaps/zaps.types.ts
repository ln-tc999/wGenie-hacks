import { z } from 'zod';
import { addressSchema, hexSchema } from '../utils/schema';
import { Address } from 'viem';

export const plasmaVaultZapInPayloadSchema = z.object({
  tokenOutMinAmount: z.bigint(),
  zapCalls: z.array(
    z.object({
      data: hexSchema,
      target: addressSchema,
      nativeTokenAmount: z.bigint(),
    }),
  ),
  nativeTokenAmount: z.bigint(),
  assetsToRefundToSender: z.array(addressSchema),
});

export type ZapInPayload = z.infer<typeof plasmaVaultZapInPayloadSchema>;

const PLASMA_VAULT_ZAP_IDS = [
  'mintRusdFromUsdc',
  'wrapTac',
  'stakeEthToSteth',
  'unwrapWstethToSteth',
] as const;

export type PlasmaVaultZapId = (typeof PLASMA_VAULT_ZAP_IDS)[number];

interface ZapInput {
  chainId: number;
  tokenInAmount: bigint;
  plasmaVaultAddress: Address;
  tokenOutMinAmount: bigint;
  zapInAllowanceContractAddress: Address;
}

export type ZapFn = (params: ZapInput) => ZapInPayload;

export interface ZapConfig {
  id: PlasmaVaultZapId;
  label: string;
  tokenIn: Address | 'chainNativeToken';
  tokenOut: Address;
  zap: ZapFn;
}

export type ZapsRegistry = Record<PlasmaVaultZapId, ZapConfig>;
