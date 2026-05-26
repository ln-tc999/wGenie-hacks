# FSN-0036: Alpha Agent Knows Vault Assets — Implementation Plan

## Overview

Add a `getVaultAssetsTool` to the Alpha Agent that reads the ERC20 tokens a vault holds (via ERC20 market substrates), enriches them with metadata (name, symbol, decimals), balances, and USD prices, and displays the results via a custom React component. This lets users reference tokens by name/symbol instead of raw addresses, and gives the agent awareness of available balances before creating actions.

## Current State Analysis

- **Alpha Agent** (`packages/mastra/src/agents/alpha-agent.ts`) has SDK action tools (Aave V3, Morpho, Euler V2) and working memory for pending actions
- **SDK** provides `PlasmaVault.getMarketSubstrates(marketId)` to read substrates, `substrateToAddress()` to convert bytes32→address, `getErc20Balance()` and `getErc20UsdPrice_18()` for token data
- **ERC20 market** (MARKET_ID 7 = `ERC20_VAULT_BALANCE`) stores token addresses as bytes32 substrates — these are the tokens the vault tracks
- **Vault context** flows to the agent via `system` prompt in `route.ts:28`: includes vault address, chainId, chain name
- **viem's `erc20Abi`** includes `name`, `symbol`, `decimals`, `balanceOf` — suitable for multicall
- **Price oracle** accessible via `plasmaVault.priceOracle` (public readonly), has `getAssetPrice(address) → [price, priceDecimals]`
- **Test vault** `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` (Base, block 41688947) is NOT in `plasma-vaults.json`

### Key Discoveries:

- `PlasmaVault.getMarketSubstrates(MARKET_ID.ERC20_VAULT_BALANCE)` returns `bytes32[]` of ERC20 addresses (`packages/sdk/src/PlasmaVault.ts:190-199`)
- `substrateToAddress()` handles bytes32→address with zero-trim and size validation (`packages/sdk/src/substrates/utils/substrate-to-address.ts:3-9`)
- Both `MARKET_ID` and `substrateToAddress` are exported from `@wgenie/fusion-sdk` (`packages/sdk/src/index.ts:8,10`)
- `PlasmaVault.priceOracle` is `public readonly` — safe to access for multicall batching
- `publicClient.multicall()` with `allowFailure: true` used extensively in web package (`packages/web/src/lib/rpc/asset-prices.ts:120-163`)
- Discriminated union pattern established in `packages/mastra/src/tools/alpha/types.ts` with `AlphaToolOutput`
- AlphaToolRenderer switch at `packages/web/src/vault-details/components/alpha-tool-renderer.tsx:35-46`

## Desired End State

1. **New tool** `getVaultAssetsTool` that reads ERC20 substrates, fetches metadata/balances/prices via multicall, returns structured data
2. **New output type** `VaultAssetsOutput` in the discriminated union
3. **New React component** `VaultAssetsList` rendering a styled table of token holdings
4. **Agent instructions** teach Alpha to call this tool before creating actions and to reference tokens by name/symbol
5. **Test vault** added to `plasma-vaults.json` for browser testing

### Verification:
- Navigate to http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/ask-ai
- Tell agent: "What tokens does this vault hold?" → agent calls `getVaultAssetsTool` → VaultAssetsList renders with token details
- Tell agent: "Supply 1000 USDC to Aave V3" → agent knows USDC address from the asset list → calls createAaveV3ActionTool with the right address
- In Mastra Studio: same flow at http://localhost:4111/agents/alpha-agent, JSON output has `type: 'vault-assets'`
- Cross-reference balances at http://localhost:8088/fusion/base/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04

## What We're NOT Doing

- Caching token data in working memory — fresh read each time
- Supporting non-ERC20 substrates (Morpho market IDs, etc.) — only ERC20_VAULT_BALANCE market
- Adding new chains beyond Ethereum/Arbitrum/Base
- Modifying the SDK — using existing exports only
- Token allowance checks or approval flows
- Automatic token resolution in action tools (agent handles mapping via instructions)

## Implementation Approach

1. Add test vault to `plasma-vaults.json` so browser testing works
2. Create the tool with efficient multicall batching: 2 multicalls for all N tokens' metadata and prices
3. Add the output type and display component following the existing discriminated union pattern
4. Update agent instructions to use the tool and reference tokens by name/symbol
5. Test in browser with Playwright

---

## Phase 1: Add Test Vault to plasma-vaults.json

### Overview
Add the Base vault `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` to the vault registry JSON so the web app can resolve it.

### Changes Required:

#### 1. Add vault entry

**File**: `plasma-vaults.json`
**Changes**: Add new entry to the `vaults` array (among the Base vaults section)

```json
{
  "name": "Test Alpha Vault",
  "address": "0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04",
  "chainId": 8453,
  "protocol": "wGenie Fusion",
  "tags": [],
  "startBlock": 41688947,
  "url": "https://app.wGenie.io/fusion/base/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04"
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/web && npx tsc --noEmit` compiles (validates JSON import)
- [ ] `cd packages/ponder && npx tsc --noEmit` compiles

#### Manual Verification:
- [ ] Web app starts and vault page loads at `/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Create getVaultAssetsTool

### Overview
Create a new Mastra tool that reads the vault's ERC20 market substrates, fetches token metadata (name, symbol, decimals), balances, and USD prices using two efficient multicalls, and returns structured data with a `type: 'vault-assets'` discriminator.

### Changes Required:

#### 1. Create the tool

**File**: `packages/mastra/src/tools/alpha/get-vault-assets.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Address, erc20Abi, formatUnits } from 'viem';
import { PlasmaVault, MARKET_ID, substrateToAddress } from '@wgenie/fusion-sdk';
import { getPublicClient } from '../plasma-vault/utils/viem-clients';

/** Minimal ABI for price oracle's getAssetPrice */
const getAssetPriceAbi = [
  {
    type: 'function',
    name: 'getAssetPrice',
    inputs: [{ name: 'asset_', type: 'address', internalType: 'address' }],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const getVaultAssetsTool = createTool({
  id: 'get-vault-assets',
  description: `Read the ERC20 tokens that a Plasma Vault holds.
Returns each token's name, symbol, balance held by the vault, USD price, and total dollar value.
Call this tool when you need to know what tokens are available in the vault, their balances, or before creating actions that reference tokens by name.
Requires vault address and chain ID.`,
  inputSchema: z.object({
    vaultAddress: z.string().describe('Plasma Vault contract address (0x...)'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base)'),
  }),
  outputSchema: z.object({
    type: z.literal('vault-assets'),
    success: z.boolean(),
    assets: z.array(z.object({
      address: z.string().describe('Token contract address'),
      name: z.string().describe('Token name (e.g. "USD Coin")'),
      symbol: z.string().describe('Token symbol (e.g. "USDC")'),
      decimals: z.number().describe('Token decimals'),
      balance: z.string().describe('Raw balance in smallest unit'),
      balanceFormatted: z.string().describe('Human-readable balance'),
      priceUsd: z.string().describe('USD price per token'),
      valueUsd: z.string().describe('Total USD value of holdings'),
    })),
    totalValueUsd: z.string().describe('Total USD value across all tokens'),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ vaultAddress, chainId }) => {
    try {
      const publicClient = getPublicClient(chainId);
      const plasmaVault = await PlasmaVault.create(
        publicClient,
        vaultAddress as Address,
      );

      // 1. Read ERC20 market substrates
      const substrates = await plasmaVault.getMarketSubstrates(
        MARKET_ID.ERC20_VAULT_BALANCE,
      );

      if (substrates.length === 0) {
        return {
          type: 'vault-assets' as const,
          success: true,
          assets: [],
          totalValueUsd: '0.00',
          message: 'No ERC20 tokens tracked by this vault',
        };
      }

      // 2. Convert substrates to addresses
      const tokenAddresses = substrates
        .map((s) => substrateToAddress(s))
        .filter((addr): addr is Address => addr !== undefined);

      if (tokenAddresses.length === 0) {
        return {
          type: 'vault-assets' as const,
          success: true,
          assets: [],
          totalValueUsd: '0.00',
          message: 'No valid token addresses found in substrates',
        };
      }

      // 3. Multicall: ERC20 metadata + balances (4 calls per token, 1 RPC round trip)
      const metadataResults = await publicClient.multicall({
        contracts: tokenAddresses.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: 'name' as const },
          { address: addr, abi: erc20Abi, functionName: 'symbol' as const },
          { address: addr, abi: erc20Abi, functionName: 'decimals' as const },
          {
            address: addr,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [plasmaVault.address],
          },
        ]),
        allowFailure: true,
      });

      // 4. Multicall: USD prices from price oracle (1 call per token, 1 RPC round trip)
      const priceResults = await publicClient.multicall({
        contracts: tokenAddresses.map((addr) => ({
          address: plasmaVault.priceOracle,
          abi: getAssetPriceAbi,
          functionName: 'getAssetPrice' as const,
          args: [addr],
        })),
        allowFailure: true,
      });

      // 5. Assemble results
      let totalValueUsdFloat = 0;
      const assets = tokenAddresses.map((addr, i) => {
        const nameResult = metadataResults[i * 4 + 0];
        const symbolResult = metadataResults[i * 4 + 1];
        const decimalsResult = metadataResults[i * 4 + 2];
        const balanceResult = metadataResults[i * 4 + 3];
        const priceResult = priceResults[i];

        const name =
          nameResult.status === 'success'
            ? (nameResult.result as string)
            : addr;
        const symbol =
          symbolResult.status === 'success'
            ? (symbolResult.result as string)
            : '???';
        const decimals =
          decimalsResult.status === 'success'
            ? Number(decimalsResult.result)
            : 18;
        const balance =
          balanceResult.status === 'success'
            ? (balanceResult.result as bigint)
            : 0n;

        const balanceFormatted = formatUnits(balance, decimals);

        let priceUsd = '0.00';
        let valueUsd = '0.00';

        if (priceResult.status === 'success') {
          const [rawPrice, rawPriceDecimals] = priceResult.result as [
            bigint,
            bigint,
          ];
          const pDecimals = Number(rawPriceDecimals);

          // Price per token in USD
          const priceFloat =
            Number(rawPrice) / 10 ** pDecimals;
          priceUsd = priceFloat.toFixed(2);

          // Total value = balance * price / 10^(decimals + priceDecimals)
          if (balance > 0n && rawPrice > 0n) {
            const valueFloat =
              Number(balance * rawPrice) / 10 ** (decimals + pDecimals);
            valueUsd = valueFloat.toFixed(2);
            totalValueUsdFloat += valueFloat;
          }
        }

        return {
          address: addr,
          name,
          symbol,
          decimals,
          balance: balance.toString(),
          balanceFormatted,
          priceUsd,
          valueUsd,
        };
      });

      return {
        type: 'vault-assets' as const,
        success: true,
        assets,
        totalValueUsd: totalValueUsdFloat.toFixed(2),
        message: `${assets.length} token${assets.length === 1 ? '' : 's'} tracked by this vault`,
      };
    } catch (error) {
      return {
        type: 'vault-assets' as const,
        success: false,
        assets: [],
        totalValueUsd: '0.00',
        message: 'Failed to read vault assets',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
```

#### 2. Export from alpha tools index

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Add export for the new tool

```typescript
export { displayPendingActionsTool } from './display-pending-actions';
export { createAaveV3ActionTool } from './create-aave-v3-action';
export { createMorphoActionTool } from './create-morpho-action';
export { createEulerV2ActionTool } from './create-euler-v2-action';
export { getVaultAssetsTool } from './get-vault-assets';
export type { AlphaToolOutput, TransactionsToSignOutput, PendingActionsOutput, VaultAssetsOutput } from './types';
```

#### 3. Register tool on alpha agent

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Import and add `getVaultAssetsTool` to the tools object

```typescript
import {
  displayPendingActionsTool,
  createAaveV3ActionTool,
  createMorphoActionTool,
  createEulerV2ActionTool,
  getVaultAssetsTool,
} from '../tools/alpha';

// In the agent definition:
tools: {
  displayPendingActionsTool,
  createAaveV3ActionTool,
  createMorphoActionTool,
  createEulerV2ActionTool,
  getVaultAssetsTool,
},
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] `cd packages/mastra && pnpm dev` starts — new tool visible in Studio

#### Manual Verification:
- [ ] In Studio: Ask agent "What tokens does this vault hold?" with vault `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` on chain 8453 → tool returns token list with names, symbols, balances, prices
- [ ] Cross-reference balances at http://localhost:8088/fusion/base/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 3: Add VaultAssetsOutput Type + React Component

### Overview
Extend the discriminated union with `VaultAssetsOutput` and create a `VaultAssetsList` React component that renders token holdings in a styled table.

### Changes Required:

#### 1. Add VaultAssetsOutput to discriminated union

**File**: `packages/mastra/src/tools/alpha/types.ts`
**Changes**: Add new type and extend union

```typescript
/** Displays the vault's ERC20 token holdings */
export type VaultAssetsOutput = {
  type: 'vault-assets';
  success: boolean;
  assets: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
    priceUsd: string;
    valueUsd: string;
  }>;
  totalValueUsd: string;
  message: string;
  error?: string;
};

/** Union of all alpha tool output types */
export type AlphaToolOutput =
  | TransactionsToSignOutput
  | PendingActionsOutput
  | VaultAssetsOutput;
```

#### 2. Create VaultAssetsList component

**File**: `packages/web/src/vault-details/components/vault-assets-list.tsx` (new)

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import type { VaultAssetsOutput } from '@wgenie/fusion-mastra/alpha-types';

type VaultAsset = VaultAssetsOutput['assets'][number];

function formatBalance(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  if (num < 0.01) return '<0.01';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

function formatUsd(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '$0.00';
  if (num < 0.01) return '<$0.01';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function AssetRow({ asset }: { asset: VaultAsset }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {asset.symbol.slice(0, 3)}
        </div>
        <div>
          <p className="text-sm font-medium">{asset.symbol}</p>
          <p className="text-xs text-muted-foreground">{asset.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{formatBalance(asset.balanceFormatted)}</p>
        <p className="text-xs text-muted-foreground">{formatUsd(asset.valueUsd)}</p>
      </div>
    </div>
  );
}

interface Props {
  assets: VaultAsset[];
  totalValueUsd: string;
  message: string;
}

export function VaultAssetsList({ assets, totalValueUsd, message }: Props) {
  if (assets.length === 0) {
    return (
      <Card className="p-4 border-dashed border-2 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">No tokens found</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        <p className="text-sm font-semibold">{formatUsd(totalValueUsd)}</p>
      </div>
      <div>
        {assets.map((asset) => (
          <AssetRow key={asset.address} asset={asset} />
        ))}
      </div>
    </Card>
  );
}
```

#### 3. Add case to AlphaToolRenderer

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
**Changes**: Import `VaultAssetsList` and add `case 'vault-assets'`

```tsx
import { VaultAssetsList } from './vault-assets-list';
// ... existing imports ...

// In the switch(typed.type):
    case 'vault-assets':
      return (
        <VaultAssetsList
          assets={typed.assets}
          totalValueUsd={typed.totalValueUsd}
          message={typed.message}
        />
      );
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] `cd packages/web && npx tsc --noEmit` compiles
- [ ] `cd packages/web && pnpm build` succeeds

#### Manual Verification:
- [ ] Navigate to ask-ai page → ask agent about vault tokens → VaultAssetsList renders with token details
- [ ] Empty state renders when vault has no tracked tokens
- [ ] Dollar values format correctly (K, M suffixes)

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual testing.

---

## Phase 4: Update Agent Instructions

### Overview
Rewrite the Alpha Agent's system prompt to include the `getVaultAssetsTool` in its workflow. The agent should call this tool when users ask about vault holdings or reference tokens by name/symbol, and use the returned addresses when creating actions.

### Changes Required:

#### 1. Update agent instructions

**File**: `packages/mastra/src/agents/alpha-agent.ts`
**Changes**: Extend the `instructions` string

```typescript
instructions: `You are an Alpha Agent for wGenie Fusion Plasma Vaults. You help users understand their vault's token holdings and build a batch of fuse actions to execute.

## YOUR CAPABILITIES

You can inspect vault holdings and create fuse actions using DeFi protocol SDKs:

### Inspect Vault
- **getVaultAssetsTool**: Read the ERC20 tokens the vault holds — names, symbols, balances, USD prices

### Create Actions
- **Aave V3**: supply, withdraw, borrow, repay (needs asset address + amount)
- **Morpho**: supply, withdraw, borrow, repay (needs Morpho market ID + amount)
- **Euler V2**: supply, withdraw (needs Euler vault address + amount)

## WORKFLOW

1. **Know the vault's assets first**: When a user asks about tokens, balances, or before creating actions involving a token by name/symbol, call getVaultAssetsTool to read the vault's current ERC20 holdings.
2. **Resolve token references**: When the user says "USDC" or "Wrapped Ether", look up the token address from the getVaultAssetsTool results. Do NOT guess addresses — always use the tool.
3. **Create actions**: Use the appropriate SDK tool (createAaveV3ActionTool, createMorphoActionTool, or createEulerV2ActionTool) with the resolved token address and amount.
4. **Store in memory**: If the tool returns success, ADD the action to your working memory's pendingActions list. Generate a simple incremental ID ("1", "2", etc.). Copy the protocol, actionType, description, and fuseActions from the tool result.
5. **Display actions**: When the user asks to see/show/list/display pending actions, call displayPendingActionsTool with the current pendingActions from your working memory.
6. **Remove actions**: When the user asks to remove an action, update your working memory pendingActions to exclude it.
7. **Clear actions**: When the user asks to clear all actions, set pendingActions to an empty array.

## TOKEN AMOUNTS

When users specify amounts in human-readable form (e.g. "1000 USDC"), convert to the token's smallest unit using decimals from getVaultAssetsTool:
- USDC (6 decimals): 1000 USDC = "1000000000"
- WETH (18 decimals): 1 WETH = "1000000000000000000"
- DAI (18 decimals): 1000 DAI = "1000000000000000000000"

## WORKING MEMORY MANAGEMENT

Your working memory has a pendingActions array. After each SDK tool call that succeeds:
- Read your current pendingActions (may be empty or have existing items)
- Append the new action with all fields (id, protocol, actionType, description, fuseActions)
- The fuseActions field contains the raw encoded data — copy it exactly from the tool output

When removing actions, provide the complete updated array WITHOUT the removed item.

## IMPORTANT RULES

- ALWAYS call getVaultAssetsTool to resolve token names/symbols to addresses. NEVER guess or hardcode token addresses.
- ALWAYS use the SDK tools to create actions. NEVER fabricate FuseAction data.
- ALWAYS call displayPendingActionsTool to show actions. NEVER describe them in text only.
- The vaultAddress and chainId come from the conversation context. Use them when calling tools.
- Keep responses concise.`,
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles

#### Manual Verification:
- [ ] Full flow test in Studio with vault `0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04` on chain 8453:
  1. Ask "What tokens does this vault hold?" → agent calls getVaultAssetsTool → shows token list
  2. Ask "Supply 1000 USDC to Aave V3" → agent resolves USDC address from previous tool output → calls createAaveV3ActionTool with correct address
  3. Ask "Show my pending actions" → agent calls displayPendingActionsTool → shows 1 action

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual testing.

---

## Phase 5: Browser Testing

### Overview
Run dev servers and test the full flow in both Mastra Studio and the web app using Playwright MCP.

### Test Steps:

#### Start dev servers
```bash
cd packages/mastra && pnpm dev    # Mastra Studio at localhost:4111
cd packages/web && pnpm dev:web   # Web app at localhost:3000
```

#### Mastra Studio (http://localhost:4111/agents/alpha-agent):
1. Start a new chat
2. Send: "What tokens does vault 0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04 on chain 8453 hold?"
3. Verify: Agent calls `getVaultAssetsTool`, returns JSON with `type: 'vault-assets'` and token list
4. Verify: Token names, symbols, balances, and USD prices are populated
5. Send: "Supply 100 USDC to Aave V3"
6. Verify: Agent resolves USDC address from the asset list, calls `createAaveV3ActionTool` with correct asset address and amount in smallest unit
7. Send: "Show pending actions"
8. Verify: Agent calls `displayPendingActionsTool`, output has `type: 'pending-actions'` with 1 action

#### Web App (http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/ask-ai):
1. Send: "What tokens does this vault hold?"
2. Verify: `VaultAssetsList` component renders with token rows showing symbol, name, balance, and USD value
3. Verify: Total value shown in header
4. Send: "Supply 100 USDC to Aave V3"
5. Verify: Agent uses correct USDC address from the asset lookup
6. Send: "Show pending actions"
7. Verify: `PendingActionsList` component renders

#### Cross-reference:
- Visit http://localhost:8088/fusion/base/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04
- Compare balances shown on this page with agent's reported balances
- Values should be consistent (small differences due to block timing are acceptable)

### Success Criteria:

#### Manual Verification:
- [ ] Studio: `getVaultAssetsTool` returns valid token data with names, symbols, balances, prices
- [ ] Studio: Agent correctly resolves token names to addresses when creating actions
- [ ] Studio: Output JSON has `type: 'vault-assets'` discriminator
- [ ] Web app: `VaultAssetsList` component renders with styled token rows
- [ ] Web app: Dollar values and balances display correctly
- [ ] Web app: Empty state renders correctly when vault has no tracked tokens
- [ ] Web app: Agent can use token names/symbols from the asset list to create actions
- [ ] Balances match (approximately) with http://localhost:8088 reference page
- [ ] No console errors in either environment

---

## Testing Strategy

### Unit Tests:
- None needed — the tool is a thin wrapper around SDK methods and multicall, both already tested
- Working memory and tool dispatch are framework-tested by Mastra

### Manual Testing Steps:
1. Query vault assets for the test vault (Base chain)
2. Verify token names/symbols match expected values
3. Verify balances are reasonable (non-zero for active vaults)
4. Verify USD prices are in realistic range
5. Test token name resolution: "Supply USDC" → correct address used
6. Test with a vault that has no ERC20 substrates → empty state
7. Cross-reference with the balances reference page

## Performance Considerations

- **RPC calls**: After `PlasmaVault.create()` (2 multicalls), the tool makes only 2 additional multicalls — 1 for ERC20 metadata + balances, 1 for prices — regardless of token count
- **No caching**: Fresh read each time ensures accuracy but adds latency (~500ms-1s per invocation)
- **Number precision**: Using JavaScript `Number` for price formatting — acceptable for display purposes since we only show 2 decimal places. Very large balances (>2^53) could lose precision in valueUsd but this is unlikely for realistic token amounts × prices

## New Files Summary

```
packages/mastra/src/tools/alpha/
├── get-vault-assets.ts           (new — the tool)
├── create-aave-v3-action.ts      (existing)
├── create-morpho-action.ts       (existing)
├── create-euler-v2-action.ts     (existing)
├── display-pending-actions.ts    (existing)
├── display-transactions.ts       (existing)
├── types.ts                      (extended with VaultAssetsOutput)
└── index.ts                      (updated exports)

packages/web/src/vault-details/components/
├── vault-assets-list.tsx          (new — React component)
├── pending-actions-list.tsx       (existing)
└── alpha-tool-renderer.tsx        (extended with vault-assets case)

plasma-vaults.json                 (add test vault entry)
```

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0036-alpha-knows-assets.md`
- FSN-0034 plan (memory + SDK tools): `thoughts/shared/plans/2026-02-14-FSN-0034-alpha-agent-memory.md`
- Alpha agent: `packages/mastra/src/agents/alpha-agent.ts`
- SDK PlasmaVault class: `packages/sdk/src/PlasmaVault.ts`
- SDK market IDs: `packages/sdk/src/markets/market-id.ts`
- SDK substrateToAddress: `packages/sdk/src/substrates/utils/substrate-to-address.ts`
- Existing viem client utility: `packages/mastra/src/tools/plasma-vault/utils/viem-clients.ts`
- AlphaToolRenderer: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx`
- Web chat route: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
- Vault registry: `packages/web/src/lib/vaults-registry.ts`
