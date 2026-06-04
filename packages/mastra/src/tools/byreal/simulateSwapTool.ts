import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BYREAL_CLI = 'byreal-cli';

export const simulateSwapTool = createTool({
  id: 'simulate-swap',
  description: `Preview a token swap on Byreal using dry-run mode.
Returns estimated output amount, price impact, and slippage warnings.
IMPORTANT: Always run this before executing a swap.`,
  inputSchema: z.object({
    inputMint: z.string().describe('Mint address of the token to swap from'),
    outputMint: z.string().describe('Mint address of the token to swap to'),
    amount: z.number().describe('Amount of input token to swap'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    simulationResult: z.any(),
    error: z.string().optional(),
  }),
  execute: async ({ inputMint, outputMint, amount }) => {
    try {
      const { stdout } = await execAsync(`${BYREAL_CLI} swap execute --input-mint ${inputMint} --output-mint ${outputMint} --amount ${amount} --dry-run -o json`);
      const simulationResult = JSON.parse(stdout);

      return {
        success: true,
        simulationResult,
      };
    } catch (error) {
      return {
        success: false,
        simulationResult: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
