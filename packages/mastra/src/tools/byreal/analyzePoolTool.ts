import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BYREAL_CLI = 'byreal-cli';

export const analyzePoolTool = createTool({
  id: 'analyze-pool',
  description: `Inspect a specific CLMM pool on Byreal in detail.
Returns detailed pool stats like K-line data, precise APR, and fee tier.`,
  inputSchema: z.object({
    poolAddress: z.string().describe('Address of the Byreal CLMM pool'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    poolData: z.any(),
    error: z.string().optional(),
  }),
  execute: async ({ poolAddress }) => {
    try {
      const { stdout } = await execAsync(`${BYREAL_CLI} pools analyze ${poolAddress} -o json`);
      const poolData = JSON.parse(stdout);

      return {
        success: true,
        poolData,
      };
    } catch (error) {
      return {
        success: false,
        poolData: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
