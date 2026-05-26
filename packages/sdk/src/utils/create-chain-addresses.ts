import { Address } from 'viem';
import { CHAIN_IDS, ChainId } from '../fusion.types';

type ChainAddresses = Record<ChainId, Address | undefined>;
type ChainAddressesOptional = Partial<Record<ChainId, Address>>;

export const createChainAddresses = <
  const TAddresses extends ChainAddressesOptional,
>(
  addresses: TAddresses,
): TAddresses & ChainAddresses => {
  const fusionChainAddresses = CHAIN_IDS.reduce(
    (acc, chainId) => {
      return {
        ...acc,
        [chainId]: addresses[chainId] ?? undefined,
      };
    },
    {} as TAddresses & ChainAddresses,
  );

  return fusionChainAddresses;
};
