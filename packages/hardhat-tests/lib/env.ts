import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  RPC_URL_MAINNET: z.string().url('RPC_URL_MAINNET must be a valid URL'),
  RPC_URL_BASE: z.string().url('RPC_URL_BASE must be a valid URL'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Missing or invalid environment variables. Check your .env file.');
}

export const env = parsed.data;
