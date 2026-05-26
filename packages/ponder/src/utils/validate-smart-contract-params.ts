import { Address } from 'viem';
import { addressSchema } from './schema';
import { ChainId, chainIdSchema } from './chains';
import { z } from 'zod';

interface Args {
  chainId: string;
  address: string;
}

type Result =
  | {
      type: 'success';
      chainId: ChainId;
      address: Address;
    }
  | {
      type: 'error';
      message: string;
    };

export const validateSmartContractParams = ({
  chainId,
  address,
}: Args): Result => {
  let parsedChainId: ChainId;
  let parsedAddress: Address;

  if (chainId === undefined) {
    return {
      type: 'error',
      message: 'Missing chainId',
    };
  }

  try {
    parsedChainId = chainIdSchema.parse(z.coerce.number().parse(chainId));
  } catch (error) {
    return {
      type: 'error',
      message: 'Invalid chainId',
    };
  }

  if (address === undefined) {
    return {
      type: 'error',
      message: 'Missing address',
    };
  }

  try {
    parsedAddress = addressSchema.parse(address);
  } catch (error) {
    return {
      type: 'error',
      message: 'Invalid address',
    };
  }

  return {
    type: 'success',
    chainId: parsedChainId,
    address: parsedAddress,
  };
};
