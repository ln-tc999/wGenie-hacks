import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { model } from '../env';
import { createStorage } from '../storage';
import {
  readTreasuryBalancesTool,
  readWalletGenieTreasuryTool,
  createMerchantMoeSwapActionTool,
  createAaveAllocationActionTool,
  createAaveWithdrawActionTool,
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
- **readTreasuryBalancesTool**: Read ERC-20 balances in the treasury.
- Users deposit native MNT into the treasury.
- The manager can execute arbitrary calls via execute(target, value, data).

### Yield & DEX Interactions
- **createAaveAllocationActionTool**: Propose a supply/deposit into Aave V3 on Mantle Sepolia to earn yield.
- **createAaveWithdrawActionTool**: Propose a withdrawal from Aave V3 back to the treasury.
- **createMerchantMoeSwapActionTool**: Create a treasury execution proposal for a Merchant Moe swap on Mantle.

## WORKFLOW
1. User asks about their treasury → use readWalletGenieTreasuryTool or readTreasuryBalancesTool.
2. User wants yield → use createAaveAllocationActionTool.
3. User wants to swap → use createMerchantMoeSwapActionTool.
4. Always return a structured proposal card.
5. You cannot execute transactions directly — only propose what the manager should execute.`,
  model,
  tools: {
    readTreasuryBalancesTool,
    readWalletGenieTreasuryTool,
    createMerchantMoeSwapActionTool,
    createAaveAllocationActionTool,
    createAaveWithdrawActionTool,
    
    // Byreal tools
    getTopPoolsTool,
    analyzePoolTool,
    simulateSwapTool,
    executeSwapTool,
  },
  memory,
});
