import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatEther, type Address } from 'viem';
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
  { type: 'function', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'manager', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'paused', inputs: [], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'guardrail', inputs: [], outputs: [
    { name: 'dailyLimit', type: 'uint256', internalType: 'uint256' },
    { name: 'maxPerTx', type: 'uint256', internalType: 'uint256' },
    { name: 'usedToday', type: 'uint256', internalType: 'uint256' },
    { name: 'lastReset', type: 'uint256', internalType: 'uint256' }
  ], stateMutability: 'view' },
  { type: 'function', name: 'whitelistedTargets', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdStr = searchParams.get('chainId');
    const address = searchParams.get('address');

    if (!chainIdStr || !address) {
      return NextResponse.json({ success: false, error: 'Missing chainId or address' }, { status: 400 });
    }

    const chainId = parseInt(chainIdStr, 10);
    if (!SUPPORTED[chainId]) {
      return NextResponse.json({ success: false, error: `Chain ID ${chainId} is not supported` }, { status: 400 });
    }

    const c = pc(chainId);
    const vaultAddress = address as Address;

    const [owner, manager, paused, guardrailData] = await Promise.all([
      c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'owner' }),
      c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'manager' }),
      c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'paused' }),
      c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'guardrail' }),
    ]);

    const MERCHANT_MOE_ROUTER = '0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a' as Address;
    const AAVE_POOL = '0x458F293454fE0d67EC0655f3672301301DD51422' as Address;

    const [isMoeWhitelisted, isAaveWhitelisted] = await Promise.all([
      c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'whitelistedTargets', args: [MERCHANT_MOE_ROUTER] }),
      c.readContract({ address: vaultAddress, abi: tAbi, functionName: 'whitelistedTargets', args: [AAVE_POOL] }),
    ]);

    const dailyLimit = guardrailData[0];
    const maxPerTx = guardrailData[1];
    const usedToday = guardrailData[2];
    const lastReset = guardrailData[3];

    return NextResponse.json({
      success: true,
      data: {
        owner,
        manager,
        paused,
        dailyLimit: dailyLimit.toString(),
        dailyLimitFormatted: formatEther(dailyLimit),
        maxPerTx: maxPerTx.toString(),
        maxPerTxFormatted: formatEther(maxPerTx),
        usedToday: usedToday.toString(),
        usedTodayFormatted: formatEther(usedToday),
        lastReset: lastReset.toString(),
        whitelist: {
          merchantMoe: isMoeWhitelisted,
          aaveV3: isAaveWhitelisted,
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching guardrails:', error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ success: true, message: 'Settings updated' });
}
