import { NextRequest } from 'next/server';
import { z } from 'zod';
import { spawnSync } from 'child_process';
import { createPublicClient, http, formatEther, encodeFunctionData, zeroAddress, erc20Abi, formatUnits, type Address } from 'viem';
import { mantle, mantleSepoliaTestnet, type Chain } from 'viem/chains';
import { isAddress } from 'viem';
import { PlasmaVault, MARKET_ID, substrateToAddress } from '@wgenie/fusion-sdk';

// ── Byreal helpers ────────────────────────────────────────────────────────────

/** Solana base58 address: 32-44 chars, no 0/O/I/l */
const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function assertSolanaAddress(value: string, label: string) {
  if (!SOLANA_ADDR_RE.test(value)) {
    throw new Error(`Invalid ${label}: must be a Solana base58 address (got "${value}")`);
  }
}

function assertPositiveAmount(value: string, label: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid ${label}: must be a positive number (got "${value}")`);
  }
}

/**
 * Run byreal-cli safely using spawnSync with an args array.
 * Shell is never involved — no injection possible.
 */
/**
 * Run byreal-cli safely. If CFO_TOOL_EXECUTOR_URL or NEXT_PUBLIC_CFO_TOOL_EXECUTOR_URL is defined,
 * we route the execution to the Railway tool executor backend.
 * Otherwise, we fallback to spawnSync locally (standard behavior in local dev).
 */
async function runByreal(args: string[], timeoutMs = 20000): Promise<any> {
  const executorUrl = process.env.CFO_TOOL_EXECUTOR_URL || process.env.NEXT_PUBLIC_CFO_TOOL_EXECUTOR_URL;

  if (executorUrl) {
    const tool = `byreal:${args[0]}`;
    const restArgs = args.slice(1);
    
    const res = await fetch(`${executorUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args: restArgs }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Tool executor error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Unknown error from tool executor');
    }

    try {
      return JSON.parse(data.output);
    } catch {
      throw new Error(`Tool executor returned non-JSON output: ${data.output?.slice(0, 200)}`);
    }
  }

  const result = spawnSync('byreal-cli', args, {
    encoding: 'utf-8',
    timeout: timeoutMs,
    // Do NOT use shell:true — that would re-introduce injection risk
  });

  if (result.error) throw new Error(`byreal-cli spawn error: ${result.error.message}`);
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || 'unknown error';
    throw new Error(`byreal-cli exited with code ${result.status}: ${stderr}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`byreal-cli returned non-JSON output: ${result.stdout?.slice(0, 200)}`);
  }
}

// ── Chain / RPC helpers ───────────────────────────────────────────────────────

const SUPPORTED: Record<number, Chain> = { 5000: mantle, 5003: mantleSepoliaTestnet };
const RPC: Record<number, string | undefined> = { 5000: process.env.MANTLE_RPC_URL, 5003: process.env.MANTLE_SEPOLIA_RPC_URL };

function pc(chainId: number) {
  const c = SUPPORTED[chainId], r = RPC[chainId];
  if (!c || !r) throw new Error(`Unsupported chain ${chainId}`);
  return createPublicClient({ chain: c, transport: http(r) });
}

const tAbi = [
  { type: 'function', name: 'balances', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
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
const lrAbi = [
  { type: 'function', name: 'getWNATIVE', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'swapExactTokensForTokens', inputs: [
    { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' },
    { name: 'path', type: 'tuple', components: [
      { name: 'pairBinSteps', type: 'uint256[]' }, { name: 'versions', type: 'uint8[]' }, { name: 'tokenPath', type: 'address[]' },
    ]}, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
  ], outputs: [{ name: 'amountOut', type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'swapExactNATIVEForTokens', inputs: [
    { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'tuple', components: [
      { name: 'pairBinSteps', type: 'uint256[]' }, { name: 'versions', type: 'uint8[]' }, { name: 'tokenPath', type: 'address[]' },
    ]}, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
  ], outputs: [{ name: 'amountOut', type: 'uint256' }], stateMutability: 'payable' },
] as const;
const aaAbi = [
  { inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'onBehalfOf', type: 'address' }, { name: 'referralCode', type: 'uint16' }], name: 'supply', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'to', type: 'address' }], name: 'withdraw', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
] as const;
const e4626 = [
  { type: 'function', name: 'asset', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'convertToAssets', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;
const pAbi = [
  { type: 'function', name: 'getAssetPrice', inputs: [{ name: 'asset_', type: 'address' }], outputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const AAVE_POOL: Record<number, Address> = { 5000: '0x458F293454fE0d67EC0655f3672301301DD51422', 5003: '0x458F293454fE0d67EC0655f3672301301DD51422' };

const tools: Record<string, { description: string; parameters: z.ZodObject<any>; handler: (args: any) => Promise<any> }> = {
  readGuardrailsConfig: {
    description: 'Read treasury guardrails config, including daily limit, max per transaction, amount spent today, pause status, and whitelisted target addresses.',
    parameters: z.object({ vaultAddress: z.string(), chainId: z.number() }),
    handler: async (args: any) => {
      const c = pc(args.chainId), a = args.vaultAddress as Address;
      const [paused, guardrailData] = await Promise.all([
        c.readContract({ address: a, abi: tAbi, functionName: 'paused' }),
        c.readContract({ address: a, abi: tAbi, functionName: 'guardrail' }),
      ]);
      const MERCHANT_MOE_ROUTER = '0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a' as Address;
      const AAVE_POOL_ADDR = '0x458F293454fE0d67EC0655f3672301301DD51422' as Address;
      const [isMoeWhitelisted, isAaveWhitelisted] = await Promise.all([
        c.readContract({ address: a, abi: tAbi, functionName: 'whitelistedTargets', args: [MERCHANT_MOE_ROUTER] }),
        c.readContract({ address: a, abi: tAbi, functionName: 'whitelistedTargets', args: [AAVE_POOL_ADDR] }),
      ]);
      return {
        type: 'guardrails-config',
        success: true,
        data: {
          paused,
          dailyLimit: guardrailData[0].toString(),
          dailyLimitFormatted: formatEther(guardrailData[0]),
          maxPerTx: guardrailData[1].toString(),
          maxPerTxFormatted: formatEther(guardrailData[1]),
          usedToday: guardrailData[2].toString(),
          usedTodayFormatted: formatEther(guardrailData[2]),
          lastReset: guardrailData[3].toString(),
          whitelist: {
            merchantMoe: isMoeWhitelisted,
            aaveV3: isAaveWhitelisted,
          }
        }
      };
    },
  },
  readWalletGenieTreasury: {
    description: 'Read treasury MNT balance, owner, manager, user deposit.',
    parameters: z.object({ vaultAddress: z.string(), chainId: z.number(), callerAddress: z.string().optional() }),
    handler: async (args: any) => {
      const c = pc(args.chainId), a = args.vaultAddress as Address;
      const [bal, owner, mgr, paused] = await Promise.all([
        c.getBalance({ address: a }), c.readContract({ address: a, abi: tAbi, functionName: 'owner' }),
        c.readContract({ address: a, abi: tAbi, functionName: 'manager' }), c.readContract({ address: a, abi: tAbi, functionName: 'paused' }),
      ]);
      let ub = 0n;
      if (args.callerAddress) ub = (await c.readContract({ address: a, abi: tAbi, functionName: 'balances', args: [args.callerAddress as Address] })) as unknown as bigint;
      return { type: 'treasury-balance', success: true, data: { treasuryMnt: bal.toString(), treasuryMntFormatted: formatEther(bal), callerBalance: ub.toString(), callerBalanceFormatted: formatEther(ub), owner, manager: mgr, paused } };
    },
  },
  readTreasuryBalances: {
    description: 'Read token balances with USD values in a treasury vault.',
    parameters: z.object({ vaultAddress: z.string(), chainId: z.number() }),
    handler: async (args: any) => {
      const c = pc(args.chainId), a = args.vaultAddress as Address;
      const pv = await PlasmaVault.create(c, a); let tv = 0;
      const ua = await c.readContract({ address: a, abi: e4626, functionName: 'asset' }) as Address;
      let addrs: Address[] = [ua];
      try { const s = await pv.getMarketSubstrates(MARKET_ID.ERC20_VAULT_BALANCE); const as = s.map(x => substrateToAddress(x)).filter((x): x is Address => !!x); const set = new Set(addrs.map(x => x.toLowerCase())); for (const x of as) { if (!set.has(x.toLowerCase())) { addrs.push(x); set.add(x.toLowerCase()); } } } catch {}
      const m = await c.multicall({ contracts: addrs.flatMap(x => [
        { address: x, abi: erc20Abi, functionName: 'name' }, { address: x, abi: erc20Abi, functionName: 'symbol' },
        { address: x, abi: erc20Abi, functionName: 'decimals' }, { address: x, abi: erc20Abi, functionName: 'balanceOf', args: [a] },
      ]), allowFailure: true });
      const pr = await c.multicall({ contracts: addrs.map(x => ({ address: pv.priceOracle, abi: pAbi, functionName: 'getAssetPrice', args: [x] })), allowFailure: true });
      const assets = addrs.map((x, i) => {
        const n = m[i*4], s = m[i*4+1], d = m[i*4+2], b = m[i*4+3], p = pr[i];
        const name = n.status === 'success' ? String(n.result) : x, symbol = s.status === 'success' ? String(s.result) : '???';
        const dec = d.status === 'success' ? Number(d.result) : 18, bal = b.status === 'success' ? BigInt(b.result as string) : 0n;
        const bf = formatUnits(bal, dec); let pu = '0.00', vu = '0.00';
        if (p.status === 'success') { const [rp, rpd] = p.result as [bigint, bigint]; const pd = Number(rpd); const pf = Number(rp) / 10**pd; pu = pf.toFixed(2); if (bal > 0n && rp > 0n) { const vf = Number(bal * rp) / 10**(dec + pd); vu = vf.toFixed(2); tv += vf; } }
        return { address: x, name, symbol, decimals: dec, balance: bal.toString(), balanceFormatted: bf, priceUsd: pu, valueUsd: vu };
      }).filter(x => BigInt(x.balance) > 0n);
      return { type: 'balance-check', success: true, assets, totalValueUsd: tv.toFixed(2) };
    },
  },
  createMerchantMoeSwapAction: {
    description: 'Create Merchant Moe swap proposal.',
    parameters: z.object({ vaultAddress: z.string(), chainId: z.number().default(5000), tokenIn: z.string(), tokenOut: z.string(), amountIn: z.string(), amountOutMin: z.string().default('0'), pairBinStep: z.number().default(10), version: z.string().default('V2_1'), useNativeInput: z.boolean().default(false), isReady: z.boolean().default(true) }),
    handler: async (args: any) => {
      const c = pc(args.chainId ?? 5000), router = '0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a' as Address;
      const dl = BigInt(Math.floor(Date.now() / 1000) + 1200), ni = args.useNativeInput || args.tokenIn === zeroAddress;
      const wn = await c.readContract({ address: router, abi: lrAbi, functionName: 'getWNATIVE' }) as Address;
      const tp = ni ? [wn as Address, args.tokenOut as Address] : [args.tokenIn as Address, args.tokenOut as Address];
      const path = { pairBinSteps: [BigInt(args.pairBinStep ?? 10)], versions: [({ V1: 0, V2: 1, V2_1: 2 } as any)[args.version ?? 'V2_1']], tokenPath: tp };
      const fn = ni ? 'swapExactNATIVEForTokens' : 'swapExactTokensForTokens';
      const data = encodeFunctionData({ abi: lrAbi, functionName: fn, args: ni ? [BigInt(args.amountOutMin ?? 0), path, args.vaultAddress as Address, dl] : [BigInt(args.amountIn), BigInt(args.amountOutMin ?? 0), path, args.vaultAddress as Address, dl] });
      const desc = ni ? `Merchant Moe swap ${args.amountIn} MNT for ${args.tokenOut.slice(0,10)}...` : `Swap ${args.amountIn} ${args.tokenIn.slice(0,10)}... -> ${args.tokenOut.slice(0,10)}...`;
      return { type: 'treasury-transaction-proposal', status: args.isReady ? 'ready' : 'partial', actions: [{ id: '1', protocol: 'merchant-moe', actionType: 'swap', description: desc, target: router, value: ni ? args.amountIn : '0', data }], newAction: { success: true, protocol: 'merchant-moe', actionType: 'swap', description: desc }, vaultAddress: args.vaultAddress, chainId: args.chainId, execution: { kind: 'treasury-execution', target: router, value: ni ? args.amountIn : '0', data, protocol: 'merchant-moe' }, actionsCount: 1, actionsSummary: desc };
    },
  },
  createAaveAllocationAction: {
    description: 'Create Aave V3 supply proposal.',
    parameters: z.object({ vaultAddress: z.string(), chainId: z.number().default(5003), asset: z.string(), amount: z.string(), isReady: z.boolean().default(true) }),
    handler: async (args: any) => {
      const pool = AAVE_POOL[args.chainId ?? 5003] ?? '0x458F293454fE0d67EC0655f3672301301DD51422';
      const data = encodeFunctionData({ abi: aaAbi, functionName: 'supply', args: [args.asset as Address, BigInt(args.amount), args.vaultAddress as Address, 0] });
      const desc = `Aave V3 supply ${args.amount} ${args.asset.slice(0,10)}...`;
      return { type: 'treasury-transaction-proposal', status: args.isReady ? 'ready' : 'partial', actions: [{ id: '1', protocol: 'aave-v3', actionType: 'supply', description: desc, target: pool, value: '0', data }], newAction: { success: true, protocol: 'aave-v3', actionType: 'supply', description: desc }, vaultAddress: args.vaultAddress, chainId: args.chainId, execution: { kind: 'treasury-execution', target: pool, value: '0', data, protocol: 'aave-v3' }, actionsCount: 1, actionsSummary: desc };
    },
  },
  createAaveWithdrawAction: {
    description: 'Create Aave V3 withdraw proposal.',
    parameters: z.object({ vaultAddress: z.string(), chainId: z.number().default(5003), asset: z.string(), amount: z.string(), isReady: z.boolean().default(true) }),
    handler: async (args: any) => {
      const pool = AAVE_POOL[args.chainId ?? 5003] ?? '0x458F293454fE0d67EC0655f3672301301DD51422';
      const to = (args.recipient ?? args.vaultAddress) as Address;
      const data = encodeFunctionData({ abi: aaAbi, functionName: 'withdraw', args: [args.asset as Address, BigInt(args.amount), to] });
      const desc = `Aave V3 withdraw ${args.amount} ${args.asset.slice(0,10)}...`;
      return { type: 'treasury-transaction-proposal', status: args.isReady ? 'ready' : 'partial', actions: [{ id: '1', protocol: 'aave-v3', actionType: 'withdraw', description: desc, target: pool, value: '0', data }], newAction: { success: true, protocol: 'aave-v3', actionType: 'withdraw', description: desc }, vaultAddress: args.vaultAddress, chainId: args.chainId, execution: { kind: 'treasury-execution', target: pool, value: '0', data, protocol: 'aave-v3' }, actionsCount: 1, actionsSummary: desc };
    },
  },
  getByrealTopPools: {
    description: 'Get top-performing liquidity pools on Byreal DEX (Solana). Sorted by APR by default. Valid sortField values: apr24h, tvlUsd, volume24hUsd, fee24hUsd, priceChange24h.',
    parameters: z.object({ sortField: z.string().default('apr24h'), limit: z.number().default(5) }),
    handler: async (args: any) => {
      try {
        const VALID_SORT = ['apr24h', 'tvlUsd', 'volume24hUsd', 'fee24hUsd', 'priceChange24h'];
        const sf = VALID_SORT.includes(args.sortField) ? args.sortField : 'apr24h';
        const lim = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
        const parsed = await runByreal(['pools', 'list', '--sort-field', sf, '-o', 'json']);
        const pools = (parsed.data?.pools || []).slice(0, lim);
        return {
          type: 'byreal-pools', success: true, count: pools.length,
          pools: pools.map((p: any) => ({
            id: p.id,
            pair: p.pair,
            // field name fallbacks in case CLI output schema varies
            apr: ((p.total_apr ?? p.apr24h ?? p.apr ?? 0) as number).toFixed(2) + '%',
            tvlUsd: '$' + ((p.tvl_usd ?? p.tvlUsd ?? 0) as number).toFixed(0),
            volume24hUsd: '$' + ((p.volume_24h_usd ?? p.volume24hUsd ?? 0) as number).toFixed(0),
            tokenA: p.token_a?.symbol ?? p.tokenA,
            tokenB: p.token_b?.symbol ?? p.tokenB,
          })),
        };
      } catch (e: any) { return { type: 'byreal-pools', success: false, error: String(e.message || e) }; }
    },
  },
  analyzeByrealPool: {
    description: 'Analyze a specific Byreal liquidity pool by address. Returns metrics, price range, volatility analysis.',
    parameters: z.object({ poolAddress: z.string() }),
    handler: async (args: any) => {
      try {
        assertSolanaAddress(args.poolAddress, 'poolAddress');
        const parsed = await runByreal(['pools', 'analyze', args.poolAddress, '-o', 'json'], 15000);
        return { type: 'byreal-pool-analysis', success: true, ...parsed.data };
      } catch (e: any) { return { type: 'byreal-pool-analysis', success: false, error: String(e.message || e) }; }
    },
  },
  simulateByrealSwap: {
    description: 'Simulate a token swap on Byreal DEX (Solana). Dry-run only — no real transaction.',
    parameters: z.object({ inputMint: z.string(), outputMint: z.string(), amount: z.string() }),
    handler: async (args: any) => {
      try {
        assertSolanaAddress(args.inputMint, 'inputMint');
        assertSolanaAddress(args.outputMint, 'outputMint');
        assertPositiveAmount(args.amount, 'amount');
        const parsed = await runByreal([
          'swap', 'execute',
          '--input-mint', args.inputMint,
          '--output-mint', args.outputMint,
          '--amount', String(args.amount),
          '--dry-run', '-o', 'json',
        ]);
        return { type: 'byreal-swap-simulation', success: true, data: parsed.data };
      } catch (e: any) { return { type: 'byreal-swap-simulation', success: false, error: String(e.message || e) }; }
    },
  },
  executeByrealSwap: {
    description: 'Execute a token swap on Byreal DEX (Solana). Requires byreal-cli wallet setup. For amounts >$1000, user must confirm first.',
    parameters: z.object({ inputMint: z.string(), outputMint: z.string(), amount: z.string(), confirmed: z.boolean().default(false) }),
    handler: async (args: any) => {
      try {
        if (!args.confirmed) return { type: 'byreal-swap-execution', success: false, error: 'Confirmation required. Set confirmed=true to proceed. For amounts >$1000, please confirm with user first.', needsConfirmation: true };
        assertSolanaAddress(args.inputMint, 'inputMint');
        assertSolanaAddress(args.outputMint, 'outputMint');
        assertPositiveAmount(args.amount, 'amount');
        const parsed = await runByreal([
          'swap', 'execute',
          '--input-mint', args.inputMint,
          '--output-mint', args.outputMint,
          '--amount', String(args.amount),
          '--confirm', '-o', 'json',
        ], 60000);
        return { type: 'byreal-swap-execution', success: true, data: parsed.data };
      } catch (e: any) { return { type: 'byreal-swap-execution', success: false, error: String(e.message || e), needsConfirmation: false }; }
    },
  },
};

const SYSTEM_PROMPT = `You are WalletGenie, a personal Web3 CFO AI agent for the Turing Test 2026 Hackathon: Track 6 (Agentic Economy - Byreal Toolkit).
You help users analyze wallets, optimize yield on Mantle L2, and explore cross-chain DeFi strategies via natural language.

## TONE & STYLE
Professional, concise CFO tone. Use plain language. Be direct.

## CAPABILITIES - Mantle L2 (5003 testnet / 5000 mainnet)
- readWalletGenieTreasury: Check treasury MNT balance, owner, manager, deposits.
- readTreasuryBalances: Check ERC-20 token balances with USD values.
- readGuardrailsConfig: Query active daily limits, transaction limits, spent totals, and protocol whitelist status.
- createMerchantMoeSwapAction: Propose a swap through treasury execute() on Merchant Moe.
- createAaveAllocationAction: Propose Aave V3 supply.
- createAaveWithdrawAction: Propose Aave V3 withdraw.

## CAPABILITIES - Byreal (Solana) - Track 6 Requirement
Byreal is a CLMM DEX on Solana. You can research and trade on it.
- getByrealTopPools: List top-performing pools by APR/TVL/volume.
- analyzeByrealPool: Deep-dive analyze a specific pool (range analysis, volatility, fee APR).
- simulateByrealSwap: Dry-run a swap to preview price impact and output amount.
- executeByrealSwap: Execute a swap (requires user confirmation for >$1000).

## WORKFLOW & GUARDRAIL SAFETY RULES
1. If the user asks about treasury limits, whitelists, settings, or safety → call readGuardrailsConfig.
2. Before proposing any transaction (swap/supply/withdraw) on Mantle:
   a. Check the transaction amount against maxPerTx and dailyLimit (via readGuardrailsConfig).
   b. Check if the target protocol contract address is whitelisted.
   c. If a proposed action would exceed any limit or target is not whitelisted, DO NOT generate a proposal immediately. Instead, warn the user clearly about the specific guardrail violation and suggest they update their limits on the Settings page first, or offer to scale down the amount to fit their limits.
3. User asks about treasury → readWalletGenieTreasury.
4. User wants yield → propose supply/withdraw.
5. User wants swap on Mantle → createMerchantMoeSwapAction.
6. User wants Byreal research → getByrealTopPools / analyzeByrealPool.
7. User wants Byreal trade → simulateByrealSwap first, then executeByrealSwap with confirmation.
8. Always return structured proposals for on-chain actions.
9. You cannot execute Mantle transactions directly - only propose.`;

function buildToolDefs() {
  return Object.entries(tools).map(([name, t]) => {
    const shape = t.parameters.shape;
    const props: Record<string, any> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape)) {
      let inner = v;
      let optional = false;
      if (inner instanceof z.ZodDefault) { const d = inner as z.ZodDefault<any>; inner = d._def.innerType; optional = true; }
      if (inner instanceof z.ZodOptional) { optional = true; inner = (inner as z.ZodOptional<any>).unwrap(); }
      let type = 'string';
      if (inner instanceof z.ZodNumber) type = 'number';
      else if (inner instanceof z.ZodBoolean) type = 'boolean';
      props[k] = { type, description: k };
      if (!optional) required.push(k);
    }
    return {
      type: 'function',
      function: { name, description: t.description, parameters: { type: 'object', properties: props, required } },
    };
  });
}

function getNextId() {
  let i = 0;
  return () => `chunk_${++i}`;
}

function sse(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { messages, callerAddress, vaultAddress, chainId } = await request.json();
  const ctx = callerAddress && isAddress(callerAddress, { strict: false }) ? `User: ${callerAddress}.` : '';
  const vctx = vaultAddress && isAddress(vaultAddress, { strict: false }) ? `Treasury: ${vaultAddress} on chain ${chainId ?? 5003}.` : '';
  const sys = `${SYSTEM_PROMPT}\n\nCONTEXT: ${ctx} ${vctx}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const nextId = getNextId();
      let nvidiaMsgs = [{ role: 'system', content: sys }, ...messages.map((m: any) => ({ role: m.role, content: m.content }))];
      let maxLoops = 10;

      while (maxLoops-- > 0) {
        const body: any = {
          model: 'meta/llama-3.3-70b-instruct',
          messages: nvidiaMsgs,
          max_tokens: 2048,
          stream: true,
        };
        const toolDefs = buildToolDefs();
        if (toolDefs.length > 0) body.tools = toolDefs;

        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          controller.enqueue(encoder.encode(sse({ type: 'error', errorText: `NVIDIA API error: ${res.status} ${errText}` })));
          break;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        const collectedCalls: any[] = [];
        let textId = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx;
          while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIdx).trimEnd();
            buffer = buffer.slice(newlineIdx + 1);
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices?.[0]?.delta;
              if (delta?.content) {
                if (!textId) { textId = nextId(); controller.enqueue(encoder.encode(sse({ type: 'text-start', id: textId }))); }
                fullContent += delta.content;
                controller.enqueue(encoder.encode(sse({ type: 'text-delta', id: textId, delta: delta.content })));
              }
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  let existing = collectedCalls.find((x: any) => x.index === tc.index);
                  if (!existing) {
                    existing = { index: tc.index, id: tc.id || `call_${collectedCalls.length}`, type: 'function', function: { name: '', arguments: '' } };
                    collectedCalls.push(existing);
                  }
                  if (tc.function?.name) existing.function.name += tc.function.name;
                  if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                }
              }
            } catch {}
          }
        }

        if (textId) controller.enqueue(encoder.encode(sse({ type: 'text-end', id: textId })));

        const toolCalls = collectedCalls.filter((tc: any) => tc.function.name);
        if (toolCalls.length === 0) {
          controller.enqueue(encoder.encode(sse({ type: 'finish', finishReason: 'stop', usage: {} })));
          break;
        }

        const toolCallEntry: any = { role: 'assistant', content: fullContent || null, tool_calls: [] };
        for (const tc of toolCalls) {
          toolCallEntry.tool_calls.push({
            id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments },
          });
        }
        nvidiaMsgs.push(toolCallEntry);

        for (const tc of toolCalls) {
          const toolImpl = tools[tc.function.name];
          const callId = tc.id;
          const argsText = tc.function.arguments;

          controller.enqueue(encoder.encode(sse({
            type: 'tool-input-start', toolCallId: callId, toolName: tc.function.name,
          })));

          let args: any = {};
          try { args = JSON.parse(argsText); } catch {}

          controller.enqueue(encoder.encode(sse({
            type: 'tool-input-available', toolCallId: callId, toolName: tc.function.name, input: args,
          })));

          let result: any;
          try { result = await toolImpl.handler(args); } catch (e: any) { result = { error: String(e) }; }

          controller.enqueue(encoder.encode(sse({
            type: 'tool-result', toolCallId: callId, toolName: tc.function.name, result,
          })));

          nvidiaMsgs.push({ role: 'tool', tool_call_id: callId, content: JSON.stringify(result) });
        }
      }

      if (maxLoops <= 0) {
        controller.enqueue(encoder.encode(sse({ type: 'finish', finishReason: 'stop', usage: {} })));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
