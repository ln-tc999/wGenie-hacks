import { NextRequest } from 'next/server';
import { isAddress } from 'viem';
import { getVaultFromRegistry, getChainName } from '@/lib/vaults-registry';
import { isValidChainId } from '@/app/chains.config';

const MASTRA_URL = process.env.MASTRA_SERVER_URL ?? 'http://localhost:4111';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (
    isNaN(chainId) ||
    !isValidChainId(chainId) ||
    !isAddress(address, { strict: false })
  ) {
    return new Response('Invalid parameters', { status: 400 });
  }

  const vault = getVaultFromRegistry(chainId, address);
  const chainName = getChainName(chainId);
  const { messages, callerAddress, sessionId } = await request.json();

  const callerContext =
    callerAddress && isAddress(callerAddress, { strict: false })
      ? ` The user's connected wallet (callerAddress for simulation) is ${callerAddress}.`
      : '';
  const vaultContext = `CURRENT VAULT CONTEXT: The user is viewing vault "${vault?.name ?? 'Unknown'}" at address ${address} on ${chainName} (chainId: ${chainId}). When the user asks about "this vault", use this context.${callerContext}`;

  // Include sessionId so each page refresh gets a fresh thread (no stale memory)
  const sessionSuffix = sessionId ? `-${sessionId}` : '';
  const threadId = `vault-${chainId}-${address.toLowerCase()}${sessionSuffix}`;

  const augmentedMessages = [
    { role: 'system', content: vaultContext },
    ...messages,
  ];

  try {
    const upstream = await fetch(`${MASTRA_URL}/chat/alphaAgent`, {
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
