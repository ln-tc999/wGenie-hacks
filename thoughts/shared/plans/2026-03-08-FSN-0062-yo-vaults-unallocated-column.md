# FSN-0062: Show Unallocated Asset Balances in YO Vaults Table

## Overview

Add an "Unallocated" column to the YO vaults table showing the treasury's unallocated balance of each vault's underlying asset. This lets the user see tokens held by the treasury that aren't yet allocated to any YO vault (e.g., WETH acquired via swap).

## Current State Analysis

- `getYoVaultsTool` fetches vault list via `createYoClient().getVaults()` and optionally reads positions via `readYoTreasuryBalances()`
- Only `snapshot.yoPositions` is used; `snapshot.assets` is ignored
- `readYoTreasuryBalances` only discovers the vault's own underlying + configured ERC20_VAULT_BALANCE substrates — tokens from swaps are invisible
- Frontend table has 5 columns: Vault, TVL, APR, Balance, Value

### Key Discoveries:

- `vault.asset.address` is available as `string` on each vault from `getVaults()` — `get-yo-vaults.ts:71`
- `readYoTreasuryBalances` returns `assets[]` with `balanceFormatted` and `symbol` — but doesn't discover non-substrate tokens
- The "simplest approach" from the ticket: multicall `balanceOf(treasuryAddress)` for each YO vault's underlying directly in the tool, bypassing `readYoTreasuryBalances` entirely

## Desired End State

The YO vaults table shows an Unallocated column between APR and Balance:

| Vault | TVL | APR | Unallocated | Balance | Value |
|-------|-----|-----|-------------|---------|-------|
| yoETH | $7.1K | 3.24% | 0.00006 WETH | 0 WETH | $0.00 |
| yoUSD | $38.6M | 5.42% | 0.08 USDC | 0 USDC | $0.00 |

Verification: In Storybook, ask the agent "show yo vaults" with a treasury that has unallocated tokens. The Unallocated column should display correct balances.

## What We're NOT Doing

- No USD value in the Unallocated column — just token amount
- Not modifying `readYoTreasuryBalances` — we do the reads directly in the tool
- Not adding price oracle calls for unallocated balances
- Not showing tokens that aren't underlying assets of any YO vault

## Implementation Approach

Multicall `balanceOf(treasuryAddress)` for each unique underlying asset address directly in `getYoVaultsTool`, only when `vaultAddress` is provided. Map results by token address and attach to each vault's output.

## Phase 1: Backend — Types + Tool

### Overview

Add `unallocatedBalance` to the vault type and output schema, then add multicall reads to `getYoVaultsTool`.

### Changes Required:

#### 1. Types

**File**: `packages/mastra/src/tools/yo-treasury/types.ts`

Add `unallocatedBalance` to the vault array item type:

```ts
export type YoVaultsOutput = {
  type: 'yo-vaults';
  success: boolean;
  chainId: number;
  vaults: Array<{
    symbol: string;
    name: string;
    address: string;
    underlying: string;
    underlyingAddress: string;
    underlyingDecimals: number;
    apy7d: string | null;
    tvl: string | null;
    chainId: number;
    userPosition?: YoVaultUserPosition;
    unallocatedBalance?: string; // formatted token amount, e.g. "0.000060"
  }>;
  message: string;
  error?: string;
};
```

#### 2. Tool — Output Schema + Multicall

**File**: `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts`

Add `erc20Abi` import from viem. Add `unallocatedBalance` to the output schema. After building positions, multicall `balanceOf` for each vault's underlying:

```ts
import { type Address, erc20Abi, formatUnits } from 'viem';

// In outputSchema, add to the vault object:
unallocatedBalance: z.string().optional(),

// After the positionsByVault block (after line 65), add:
let unallocatedByUnderlying: Map<string, string> | undefined;
if (vaultAddress) {
  try {
    const publicClient = getPublicClient(chainId);
    // Deduplicate underlying addresses
    const underlyingAddresses = [...new Set(vaults.map(v => v.asset.address.toLowerCase()))];
    const balanceResults = await publicClient.multicall({
      contracts: underlyingAddresses.map((addr) => ({
        address: addr as Address,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [vaultAddress as Address],
      })),
      allowFailure: true,
    });
    // Build map: underlying address -> formatted balance
    unallocatedByUnderlying = new Map();
    for (let i = 0; i < underlyingAddresses.length; i++) {
      const result = balanceResults[i];
      if (result.status === 'success') {
        const balance = result.result as bigint;
        // Find a vault with this underlying to get decimals
        const vault = vaults.find(v => v.asset.address.toLowerCase() === underlyingAddresses[i]);
        const decimals = vault?.asset.decimals ?? 18;
        unallocatedByUnderlying.set(underlyingAddresses[i], formatUnits(balance, decimals));
      }
    }
  } catch {
    // Unallocated reads failed — continue without them
  }
}

// In vaultData map (line 67), add:
unallocatedBalance: unallocatedByUnderlying?.get(vault.asset.address.toLowerCase()),
```

Note: The `publicClient` is currently created inside the `if (vaultAddress)` block for positions. Refactor to create it once and reuse for both position reads and unallocated balance reads.

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] Web package compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:

- [ ] In Storybook, "show yo vaults" returns vaults with `unallocatedBalance` field populated
- [ ] After swapping USDC to WETH, the WETH unallocated balance appears on the yoETH vault row

---

## Phase 2: Frontend — Add Unallocated Column

### Overview

Add an Unallocated column header and cell to the table, between APR and Balance.

### Changes Required:

#### 1. Table Column

**File**: `packages/web/src/yo-treasury/components/yo-vaults-list.tsx`

Add a helper function and column:

```ts
function formatUnallocated(vault: YoVaultsOutput['vaults'][number]): string {
  if (!vault.unallocatedBalance) return `0 ${vault.underlying}`;
  const val = parseFloat(vault.unallocatedBalance);
  if (val === 0) return `0 ${vault.underlying}`;
  const decimals = vault.underlyingDecimals <= 6 ? 2 : 6;
  return `${val.toFixed(decimals)} ${vault.underlying}`;
}
```

In `<thead>`, add between APR and Balance:
```tsx
<th className="font-normal pb-1 text-right">Unallocated</th>
```

In `<tbody>`, add between APR and Balance cells:
```tsx
<td className="py-1 text-right font-mono">{formatUnallocated(vault)}</td>
```

### Success Criteria:

#### Automated Verification:

- [ ] Web package compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:

- [ ] In Storybook, the YO vaults table shows the Unallocated column
- [ ] Unallocated column displays correct token amounts with proper formatting
- [ ] Vaults where treasury holds 0 of the underlying show "0 SYMBOL"
- [ ] After swapping USDC to WETH, yoETH row shows WETH unallocated balance

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Manual Testing Steps:

1. Open Storybook Treasury Tab
2. Say "show yo vaults" — verify Unallocated column appears with balances
3. If treasury has WETH from a swap, verify it appears in the yoETH Unallocated cell
4. Verify vaults with 0 unallocated show "0 SYMBOL"

## Known Limitation: RPC Mismatch in Storybook

Discovered during testing: Mastra agent tools use `BASE_RPC_URL` (from `packages/mastra/src/env.ts`), which points to real Base mainnet. Storybook's wagmi uses `NEXT_PUBLIC_RPC_URL_BASE`, which can point to an Anvil fork. When testing on an Anvil fork, the deposit form shows fork-state positions (e.g., 5,243 USDC) while the agent tool reads real chain state (0 balances). The Unallocated column works correctly — it's just reading from a different chain state than the frontend.

**Workaround**: Set `BASE_RPC_URL` in mastra env to the same Anvil fork URL.

## References

- Ticket: `thoughts/kuba/tickets/fsn_0062-yo-vaults-unallocated-column.md`
- Tool: `packages/mastra/src/tools/yo-treasury/get-yo-vaults.ts`
- Types: `packages/mastra/src/tools/yo-treasury/types.ts`
- Frontend: `packages/web/src/yo-treasury/components/yo-vaults-list.tsx`
- Balance reader (not modified): `packages/mastra/src/tools/yo-treasury/read-yo-treasury-balances.ts`
