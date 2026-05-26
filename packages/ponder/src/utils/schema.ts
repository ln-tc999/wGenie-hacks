import { isAddress, Address } from 'viem';
import { z } from 'zod';

export const addressSchema = z.custom<Address>(
  (address) => {
    if (typeof address !== 'string') return false;
    return isAddress(address, { strict: false });
  },
  {
    error: 'Incorrect address',
  },
);
