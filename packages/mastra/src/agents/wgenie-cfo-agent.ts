import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { env } from '../env';
import { createStorage } from '../storage';
import {
  readTreasuryBalancesTool,
  createMerchantMoeSwapActionTool,
} from '../tools/wgenie-cfo';
import {
  getTopPoolsTool,
  analyzePoolTool,
  simulateSwapTool,
  executeSwapTool,
} from '../tools/byreal';
import { createWorkingMemorySchema } from '../tools/shared/pending-action-schema';

export const wgenieCfoWorkingMemorySchema = createWorkingMemorySchema(['wgenie-erc4626', 'wgenie-swap', 'byreal-swap']);

const memory = new Memory({
  storage: createStorage('wgenie-cfo-agent-memory'),
  options: {
    workingMemory: {
      enabled: true,
      schema: wgenieCfoWorkingMemorySchema,
    },
  },
});

export const wgenieCfoAgent = new Agent({
  id: 'wgenie-cfo-agent',
  name: 'WalletGenie CFO Agent',
  instructions: `You are WalletGenie, a personal Web3 CFO AI agent.
You help users analyze their wallets, optimize yield dynamically, and execute DeFi strategies via natural language.

## TONE & STYLE
- Maintain a professional, concise, "CFO" tone.
- When formatting tool output for text, keep it incredibly brief if the tool already rendered a UI element.
- Use plain language: "your USDC", "swap on Byreal".

## YOUR CAPABILITIES
### Treasury
- **readTreasuryBalancesTool**: Read treasury's token balances.

### Byreal Skills (Solana)
- **getTopPoolsTool**: Fetch best APR pools on Byreal.
- **analyzePoolTool**: Inspect specific Byreal CLMM pools.
- **simulateSwapTool**: Dry-run a swap via Byreal.
- **executeSwapTool**: Execute a swap on Byreal (ensure you've simulated it first).

## WORKFLOW
- For Byreal actions, use Byreal tools to fetch data. If asked to swap, ALWAYS simulate first before executing.
- Track budget/tax info implicitly if requested by analyzing past transactions.`,
  model: env.MODEL,
  tools: {
    readTreasuryBalancesTool,
    createMerchantMoeSwapActionTool,
    
    // Byreal tools
    getTopPoolsTool,
    analyzePoolTool,
    simulateSwapTool,
    executeSwapTool,
  },
  memory,
});
