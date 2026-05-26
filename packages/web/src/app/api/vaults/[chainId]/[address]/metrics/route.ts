import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { isAddress } from 'viem';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (isNaN(chainId) || !isAddress(address, { strict: false })) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  const [activeResult, allTimeResult, firstDepositResult] = await Promise.all([
    // Active depositors (positive balance) — count and total balance
    supabase
      .from('depositor')
      .select('share_balance', { count: 'exact' })
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress)
      .gt('share_balance', '0'),

    // All-time depositors
    supabase
      .from('depositor')
      .select('*', { count: 'exact', head: true })
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress),

    // First deposit timestamp
    supabase
      .from('deposit_event')
      .select('timestamp')
      .eq('chain_id', chainId)
      .eq('vault_address', normalizedAddress)
      .order('timestamp', { ascending: true })
      .limit(1),
  ]);

  // Sum share balances for total
  const totalShareBalance = activeResult.data?.reduce(
    (acc, row) => acc + BigInt(row.share_balance),
    0n,
  ) ?? 0n;

  return NextResponse.json({
    metrics: {
      totalShareBalance: totalShareBalance.toString(),
      activeDepositors: activeResult.count ?? 0,
      allTimeDepositors: allTimeResult.count ?? 0,
      firstDeposit: firstDepositResult.data?.[0]?.timestamp ?? null,
    },
  });
}
