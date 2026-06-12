import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, createWalletClient, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantle, mantleSepoliaTestnet, type Chain } from 'viem/chains';

const SUPPORTED: Record<number, Chain> = {
  5000: mantle,
  5003: mantleSepoliaTestnet,
};

const RPC: Record<number, string | undefined> = {
  5000: process.env.MANTLE_RPC_URL || 'https://rpc.mantle.xyz',
  5003: process.env.MANTLE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
};

function pc(chainId: number) {
  const c = SUPPORTED[chainId];
  const r = RPC[chainId];
  if (!c || !r) throw new Error(`Unsupported chain ${chainId}`);
  return createPublicClient({ chain: c, transport: http(r) });
}

const tAbi = [
  { type: 'function', name: 'execute', inputs: [
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' }
  ], outputs: [{ name: '', type: 'bytes' }], stateMutability: 'payable' },
] as const;

export async function POST(req: NextRequest) {
  try {
    const { chainId, vaultAddress, target, value, data } = await req.json();

    if (!chainId || !vaultAddress || !target || value === undefined || !data) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (!SUPPORTED[chainId]) {
      return NextResponse.json({ success: false, error: `Chain ID ${chainId} is not supported` }, { status: 400 });
    }

    const client = pc(chainId);
    
    // Simulate transaction first to check guardrails (daily limit, whitelist, paused)
    try {
      await client.simulateContract({
        address: vaultAddress as Address,
        abi: tAbi,
        functionName: 'execute',
        args: [target as Address, BigInt(value), data as Hex],
        value: BigInt(value),
      });
    } catch (simError: any) {
      console.error('Guardrail check failed during simulation:', simError);
      return NextResponse.json({
        success: false,
        error: `Guardrail violation or simulation failed: ${simError.shortMessage || simError.message || String(simError)}`,
        simulated: true
      }, { status: 400 });
    }

    // If private key is available, execute on-chain
    const pKey = process.env.RELAYER_PRIVATE_KEY;
    if (pKey) {
      const account = privateKeyToAccount(pKey as Hex);
      const walletClient = createWalletClient({
        account,
        chain: SUPPORTED[chainId],
        transport: http(RPC[chainId]),
      });

      const txHash = await walletClient.writeContract({
        address: vaultAddress as Address,
        abi: tAbi,
        functionName: 'execute',
        args: [target as Address, BigInt(value), data as Hex],
        value: BigInt(value),
      });

      return NextResponse.json({
        success: true,
        message: 'Transaction executed successfully by relayer',
        txHash,
        relayed: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Simulation successful! No relayer key configured. Sign transaction in frontend.',
      simulated: true
    });

  } catch (error: any) {
    console.error('Error executing relayer transaction:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}
