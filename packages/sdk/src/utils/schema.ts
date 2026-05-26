import { Address, Hex, isAddress, isHex } from 'viem';
import { z } from 'zod';

export const addressSchema = z.custom<Address>(
  (address) => {
    if (typeof address !== 'string') return false;
    return isAddress(address, { strict: false });
  },
  {
    message: 'Incorrect address',
  },
);

export const hexSchema = z.custom<Hex>(isHex, {
  message: 'Incorrect hex value',
});
