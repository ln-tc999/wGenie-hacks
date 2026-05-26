import { isAddress, type Address } from 'viem';
import z from 'zod';

/**
 * The address of Ethereum account or smart contract
 *
 * @example '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
 */
export const addressSchema = z.custom<Address>(
  (address) => {
    if (typeof address === 'string') {
      return isAddress(address, { strict: false });
    }
    return false;
  },
  {
    message: 'Incorrect address',
  },
);
