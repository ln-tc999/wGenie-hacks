import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAppConfig } from '@/lib/app-config';

// Hardhat account 0 — well-known test private key, NEVER use with real funds
const DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Dev login is only available in development mode.' },
      { status: 403 },
    );
  }

  const account = privateKeyToAccount(DEV_PRIVATE_KEY);

  const message = createSiweMessage({
    domain: 'localhost:3000',
    address: account.address,
    statement: `Sign in to ${getAppConfig().name} (dev mode)`,
    uri: 'http://localhost:3000',
    version: '1',
    chainId: 1,
    nonce: generateSiweNonce(),
  });

  const signature = await account.signMessage({ message });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithWeb3({
    chain: 'ethereum',
    message,
    signature: signature as `0x${string}`,
  });

  if (error) {
    return NextResponse.json(
      { error: `Dev login failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.redirect(new URL('/', 'http://localhost:3000'));
}
