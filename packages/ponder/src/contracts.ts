import { Address, isAddress } from 'viem';
import { z } from 'zod';
import { ChainId } from './utils/chains';
import plasmaVaultsJson from '../../../plasma-vaults.json';

const addressSchema = z.custom<Address>(
  (address) => isAddress(address as string, { strict: false }),
  { message: 'Invalid address' },
);

const vaultSchema = z.object({
  name: z.string(),
  address: addressSchema,
  chainId: z.number(),
  protocol: z.string(),
  tags: z.array(z.string()),
  startBlock: z.number(),
  url: z.url(),
});

const vaultsSchema = z.array(vaultSchema);

interface ParsedVault {
  name: string;
  address: Address;
  chainId: ChainId;
  protocol: string;
  tags: string[];
  startBlock: number;
  url: string;
}

const parseVaults = (): ParsedVault[] => {
  const vaults = vaultsSchema.parse(plasmaVaultsJson.vaults);
  return vaults.map((vault) => ({
    ...vault,
    address: vault.address as Address,
    chainId: vault.chainId as ChainId,
  }));
};

export const ERC4626_VAULTS = parseVaults();

export const getChainVaults = (chainId: ChainId) => {
  return ERC4626_VAULTS.filter((vault) => vault.chainId === chainId);
};

export const getChainStartBlock = (chainId: ChainId) => {
  const vaults = getChainVaults(chainId);
  if (vaults.length === 0) return 0;
  const startBlocks = vaults.map((vault) => vault.startBlock);
  return Math.min(...startBlocks);
};
