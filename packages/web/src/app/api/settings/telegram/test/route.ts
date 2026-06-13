import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// POST /api/settings/telegram/test
// body: { chat_id }
export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured on server.' }, { status: 503 });
  }

  const { chat_id } = await request.json();
  if (!chat_id) {
    return NextResponse.json({ error: 'chat_id required' }, { status: 400 });
  }

  const text = [
    '✅ *WalletGenie CFO connected\\!*',
    '',
    'Your Telegram is now linked to your treasury\\.',
    'You will receive:',
    '• Transaction execution alerts',
    '• Guardrail limit warnings',
    '• Strategy status changes',
    '• Daily treasury reports \\(if enabled\\)',
    '',
    '_Powered by WalletGenie · Mantle L2_',
  ].join('\n');

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chat_id).trim(),
        text,
        parse_mode: 'MarkdownV2',
      }),
    },
  );

  const json = await res.json();

  if (!res.ok || !json.ok) {
    const desc = json?.description ?? 'Unknown Telegram error';
    return NextResponse.json({ error: desc }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
