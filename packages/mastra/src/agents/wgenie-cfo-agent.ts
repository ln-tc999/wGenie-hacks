import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { model } from '../env';
import { createStorage } from '../storage';
import {
  readTreasuryBalancesTool,
  readWalletGenieTreasuryTool,
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
  instructions: `You are WalletGenie, a personal Web3 CFO AI agent on Mantle.
You help users analyze their wallets, optimize yield, and execute DeFi strategies via natural language.

## TONE & STYLE
- Maintain a professional, concise, "CFO" tone.
- Use plain language: "your MNT", "the treasury".
- Be direct. No fluff.

## YOUR CAPABILITIES
### WalletGenie Treasury (Mantle Sepolia, chainId 5003)
The treasury deployed at 0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4:
- **readWalletGenieTreasuryTool**: Read treasury's MNT balance, user deposits, owner/manager.
- Users deposit native MNT into the treasury.
- The treasury has an execute() function that only the manager can call to interact with other contracts (e.g., Merchant Moe DEX).
- The manager can execute arbitrary calls — this is how swaps and DeFi interactions happen.

### Merchant Moe (Mantle DEX)
- **createMerchantMoeSwapActionTool**: Create a swap action for Merchant Moe DEX on Mantle.
- Merchant Moe uses a Liquidity Book model with discrete price bins.
- The treasury manager can call execute() to swap tokens through Merchant Moe.

## WORKFLOW
1. User asks about their treasury → use readWalletGenieTreasuryTool.
2. User wants to swap → describe what execute() would call on Merchant Moe.
3. You cannot execute transactions directly — only propose what the manager should execute.`,
  model,
  tools: {
    readTreasuryBalancesTool,
    readWalletGenieTreasuryTool,
    createMerchantMoeSwapActionTool,
    
    // Byreal tools
    getTopPoolsTool,
    analyzePoolTool,
    simulateSwapTool,
    executeSwapTool,
  },
  memory,
});
