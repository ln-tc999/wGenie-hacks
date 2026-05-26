import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';
import { isAddress } from 'viem';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (isNaN(chainId) || !isAddress(address, { strict: false })) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10));
  const limit = Math.min(1000, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  // Total count of active depositors
  const { count: totalCount } = await supabase
    .from('depositor')
    .select('*', { count: 'exact', head: true })
    .eq('chain_id', chainId)
    .eq('vault_address', normalizedAddress)
    .gt('share_balance', '0');

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Paginated depositors sorted by share balance desc
  const { data: depositors } = await supabase
    .from('depositor')
    .select('depositor_address, share_balance, first_activity, last_activity')
    .eq('chain_id', chainId)
    .eq('vault_address', normalizedAddress)
    .gt('share_balance', '0')
    .order('share_balance', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    depositors: (depositors ?? []).map((d) => ({
      address: d.depositor_address,
      shareBalance: d.share_balance,
      firstActivity: d.first_activity,
      lastActivity: d.last_activity,
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount: total,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      limit,
    },
  });
}
