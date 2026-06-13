import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@wgenie/fusion-supabase-ponder';

// GET /api/settings/telegram?wallet=0x...
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

  const { data, error } = await supabase
    .from('telegram_settings')
    .select('*')
    .eq('wallet_address', wallet.toLowerCase())
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data ?? null });
}

// POST /api/settings/telegram
// body: { wallet, chat_id, display_name, notif_tx_executed, notif_guardrail, notif_strategy_change, notif_daily_report, daily_report_hour }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wallet, chat_id, display_name, notif_tx_executed, notif_guardrail, notif_strategy_change, notif_daily_report, daily_report_hour } = body;

  if (!wallet || !chat_id) {
    return NextResponse.json({ error: 'wallet and chat_id required' }, { status: 400 });
  }

  const hour = Number(daily_report_hour ?? 8);
  if (isNaN(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ error: 'daily_report_hour must be 0–23' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('telegram_settings')
    .upsert({
      wallet_address: wallet.toLowerCase(),
      chat_id: String(chat_id).trim(),
      display_name: String(display_name ?? '').trim(),
      notif_tx_executed: Boolean(notif_tx_executed ?? true),
      notif_guardrail: Boolean(notif_guardrail ?? true),
      notif_strategy_change: Boolean(notif_strategy_change ?? true),
      notif_daily_report: Boolean(notif_daily_report ?? false),
      daily_report_hour: hour,
    }, { onConflict: 'wallet_address' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
