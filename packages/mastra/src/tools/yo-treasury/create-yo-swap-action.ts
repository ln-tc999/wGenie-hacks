import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, type Hex, encodeFunctionData, erc20Abi } from 'viem';
import {
  yoUniversalTokenSwapperFuseAbi,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
} from '@wgenie/fusion-sdk';
import { buildTransactionProposal, transactionProposalOutputSchema } from '../alpha/build-transaction-proposal';
import { formatTokenAmount } from '../alpha/format-amount';
import { existingActionSchema } from './types';
import { getYoUnderlyingAddresses } from './yo-vault-metadata';

/** Call Odos quote + assemble APIs to get swap calldata */
async function getOdosSwapCalldata(params: {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageLimitPercent?: number;
  userAddr: string;
}): Promise<{
  routerAddress: string;
  swapCalldata: string;
  amountOut: string;
  gasEstimate: number;
}> {
  const quoteResponse = await fetch('https://api.odos.xyz/sor/quote/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId: params.chainId,
      inputTokens: [{ tokenAddress: params.tokenIn, amount: params.amountIn }],
      outputTokens: [{ tokenAddress: params.tokenOut, proportion: 1 }],
      slippageLimitPercent: params.slippageLimitPercent ?? 1.0,
      userAddr: params.userAddr,
    }),
  });

  if (!quoteResponse.ok) {
    throw new Error(`Odos quote failed: ${quoteResponse.status} ${await quoteResponse.text()}`);
  }

  const quote = await quoteResponse.json();

  const assembleResponse = await fetch('https://api.odos.xyz/sor/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddr: params.userAddr,
      pathId: quote.pathId,
      simulate: false,
    }),
  });

  if (!assembleResponse.ok) {
    throw new Error(`Odos assemble failed: ${assembleResponse.status} ${await assembleResponse.text()}`);
  }

  const assembled = await assembleResponse.json();

  return {
    routerAddress: assembled.transaction.to,
    swapCalldata: assembled.transaction.data,
    amountOut: quote.outAmounts?.[0] ?? '0',
    gasEstimate: quote.gasEstimate ?? 0,
  };
}

export const createYoSwapActionTool = createTool({
  id: 'create-yo-swap-action',
  description: `Create a fuse action to swap tokens via the UniversalTokenSwapperFuse using Odos aggregator.
Use this when the user wants to swap assets (e.g., "Swap 500 USDC to WETH").
The swap executes through the Odos router via the vault's SwapExecutor.
Returns a unified transaction proposal with simulation.
Set isReady=true when this is the last action, false if more actions follow.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Treasury PlasmaVault address'),
    chainId: z.number().describe('Chain ID (8453 for Base)'),
    tokenIn: z.string().describe('Address of token to sell'),
    tokenOut: z.string().describe('Address of token to buy'),
    amountIn: z.string().describe('Amount to swap in smallest unit'),
    executorAddress: z.string().describe('SwapExecutor contract address'),
    tokenInSymbol: z.string().optional().describe('Symbol of token to sell (e.g., "USDC") for human-readable description'),
    tokenInDecimals: z.number().optional().describe('Decimals of token to sell for formatting'),
    tokenOutSymbol: z.string().optional().describe('Symbol of token to buy (e.g., "WETH")'),
    callerAddress: z.string().optional(),
    existingPendingActions: z.array(existingActionSchema).optional(),
    isReady: z.boolean().describe('true if this is the last action (show execute button), false if more actions follow'),
  }),
  outputSchema: transactionProposalOutputSchema,
  execute: async ({ vaultAddress, chainId, tokenIn, tokenOut, amountIn, executorAddress, tokenInSymbol, tokenInDecimals, tokenOutSymbol, callerAddress, existingPendingActions, isReady }) => {
    try {
      const odos = await getOdosSwapCalldata({
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
        userAddr: executorAddress,
      });

      const targets: Address[] = [
        tokenIn as Address,
        odos.routerAddress as Address,
      ];
      const swapData: Hex[] = [
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [odos.routerAddress as Address, BigInt(amountIn)],
        }),
        odos.swapCalldata as Hex,
      ];

      const fuseCalldata = encodeFunctionData({
        abi: yoUniversalTokenSwapperFuseAbi,
        functionName: 'enter',
        args: [{
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: BigInt(amountIn),
          data: { targets, data: swapData },
        }],
      });

      const swapFuseAddress = UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[chainId as keyof typeof UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS];
      if (!swapFuseAddress) throw new Error(`Swap fuse not configured for chain ${chainId}`);

      const newFuseActions = [{ fuse: swapFuseAddress, data: fuseCalldata }];

      // Build human-readable description
      let description: string;
      if (tokenInSymbol && tokenInDecimals !== undefined) {
        const formattedIn = formatTokenAmount(amountIn, tokenInDecimals);
        description = `Swap ${formattedIn} ${tokenInSymbol} → ${tokenOutSymbol ?? tokenOut.slice(0, 10)} via Odos`;
      } else {
        description = `Swap ${amountIn} ${tokenIn.slice(0, 10)}... → ${tokenOut.slice(0, 10)}... via Odos`;
      }

      return buildTransactionProposal({
        newAction: {
          success: true,
          protocol: 'yo-swap',
          actionType: 'swap',
          description,
          fuseActions: newFuseActions,
        },
        existingPendingActions,
        vaultAddress,
        chainId,
        callerAddress,
        isReady,
        additionalTokenAddresses: getYoUnderlyingAddresses(chainId),
      });
    } catch (error) {
      return buildTransactionProposal({
        newAction: {
          success: false,
          protocol: 'yo-swap',
          actionType: 'swap',
          description: 'Failed: swap via Odos',
          fuseActions: [],
          error: error instanceof Error ? error.message : String(error),
        },
        existingPendingActions,
        vaultAddress,
        chainId,
        callerAddress,
        isReady: false,
        additionalTokenAddresses: getYoUnderlyingAddresses(chainId),
      });
    }
  },
});
