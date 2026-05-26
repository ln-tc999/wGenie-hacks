import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';

export interface VaultParams {
  chainId: ChainId;
  vaultAddress: Address;
}
