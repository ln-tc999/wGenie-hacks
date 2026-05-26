import { NextResponse, type NextRequest } from 'next/server';
import { isAddressEqual, type Address } from 'viem';
import { parseSiweMessage } from 'viem/siwe';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const WHITELISTED_ADDRESSES: Address[] = [
  '0xa6a7b66ebbb5cbfdff3c83781193618ee4e22f4d',
  '0x35b4915b0fCA6097167fAa8340D3af3E51AA3841',
];

// --- Rate limiting (in-memory, per IP) ---

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;
const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodic cleanup of stale entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.timestamps.push(now);
  rateLimitMap.set(ip, entry);
  return false;
}

// --- Route handler ---

export async function POST(request: NextRequest) {
  // 1. Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // 2. Validate request body
  let message: string;
  let signature: string;

  try {
    const body = await request.json();
    message = body.message;
    signature = body.signature;

    if (typeof message !== 'string' || typeof signature !== 'string') {
      throw new Error('Invalid types');
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Expected { message, signature }.' },
      { status: 400 }
    );
  }

  // 3. Parse SIWE message to extract address
  let address: string;
  try {
    const parsed = parseSiweMessage(message);
    if (!parsed.address) {
      throw new Error('No address in SIWE message');
    }
    address = parsed.address;
  } catch {
    return NextResponse.json(
      { error: 'Invalid SIWE message.' },
      { status: 400 }
    );
  }

  // 4. Check whitelist
  if (!WHITELISTED_ADDRESSES.some((w) => isAddressEqual(w, address as Address))) {
    return NextResponse.json(
      { error: 'Address not authorized. Contact an administrator to request access.' },
      { status: 403 }
    );
  }

  // 5. Authenticate with Supabase (session cookies set via cookies() API)
  const serverSupabase = await createSupabaseServerClient();
  const { error: authError } = await serverSupabase.auth.signInWithWeb3({
    chain: 'ethereum',
    message,
    signature: signature as `0x${string}`,
  });

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 401 }
    );
  }

  // 6. Success
  return NextResponse.json({ ok: true });
}
