import { NextRequest } from 'next/server';
import { isAddress } from 'viem';

const MASTRA_URL = process.env.MASTRA_SERVER_URL ?? 'http://localhost:4111';

export async function POST(request: NextRequest) {
  const { messages, callerAddress, vaultAddress, chainId, sessionId } = await request.json();

  const callerContext =
    callerAddress && isAddress(callerAddress, { strict: false })
      ? ` The user's connected wallet (callerAddress for simulation) is ${callerAddress}.`
      : '';
  const vaultContext =
    vaultAddress && isAddress(vaultAddress, { strict: false })
      ? ` The user's treasury vault address is ${vaultAddress} on chainId ${chainId}.`
      : ' The user has not created a treasury vault yet.';
  const system = `CURRENT CONTEXT:${callerContext}${vaultContext} Chain: ${chainId ?? 8453} (Base).`;

  // Include sessionId so each page refresh gets a fresh thread (no stale memory)
  const sessionSuffix = sessionId ? `-${sessionId}` : '';
  const threadId = callerAddress
    ? `yo-treasury-${callerAddress.toLowerCase()}${sessionSuffix}`
    : `yo-treasury-anonymous${sessionSuffix}`;

  const augmentedMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  try {
    const upstream = await fetch(`${MASTRA_URL}/chat/yoTreasuryAgent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.MASTRA_API_KEY ?? '',
      },
      body: JSON.stringify({
        messages: augmentedMessages,
        maxSteps: 10,
        memory: { thread: threadId, resource: threadId },
      }),
      signal: request.signal,
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unknown error');
      console.error('Mastra server error:', upstream.status, errorText);
      return new Response('Agent server error', { status: upstream.status });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error proxying to Mastra', error);
    return new Response('An error occurred while processing your request.', {
      status: 500,
    });
  }
}
