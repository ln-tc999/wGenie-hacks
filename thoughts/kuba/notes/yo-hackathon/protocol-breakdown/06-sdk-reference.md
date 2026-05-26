# YO Protocol — SDK & CLI Reference

## TypeScript SDK: `@yo-protocol/core`

Framework-agnostic, built on viem. No `@yo-protocol/react` package exists.

### Installation

```bash
npm install @yo-protocol/core
```

### Client Setup

```typescript
import { createYoClient, VAULTS } from '@yo-protocol/core'

// Read-only (no wallet)
const client = createYoClient({ chainId: 8453 })

// With wallet (for deposits/redeems)
const client = createYoClient({ chainId: 8453, walletClient })

// With custom RPC
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
const publicClient = createPublicClient({ chain: base, transport: http('https://...') })
const client = createYoClient({ chainId: 8453, publicClient })

// With partner attribution
const client = createYoClient({ chainId: 8453, walletClient, partnerId: 42 })
```

**Config type:**
```typescript
type SupportedChainId = 1 | 8453 | 42161

interface YoClientConfig {
  chainId: SupportedChainId
  publicClient?: PublicClient
  walletClient?: WalletClient
  partnerId?: number  // default: 9999 (unattributed)
}
```

---

## Method Reference

### Vault Reads (no wallet needed)

| Method | Returns | Description |
|--------|---------|-------------|
| `getVaults()` | `VaultConfig[]` | Local vault configs for chain (no RPC) |
| `getVaultState(vault)` | `Promise<VaultState>` | On-chain: name, symbol, decimals, totalAssets, totalSupply, exchangeRate |
| `previewDeposit(vault, assets)` | `Promise<bigint>` | Shares for given assets (with fees) |
| `previewRedeem(vault, shares)` | `Promise<bigint>` | Assets for given shares (with fees) |
| `convertToAssets(vault, shares)` | `Promise<bigint>` | Share-to-asset (no fees) |
| `convertToShares(vault, assets)` | `Promise<bigint>` | Asset-to-share (no fees) |
| `isPaused(vault)` | `Promise<boolean>` | Check if vault is paused |
| `getIdleBalance(vault)` | `Promise<bigint>` | Vault's uninvested balance |

### User Reads

| Method | Returns | Description |
|--------|---------|-------------|
| `getTokenBalance(token, account)` | `Promise<TokenBalance>` | `{ token, balance, decimals }` |
| `getShareBalance(vault, account)` | `Promise<bigint>` | Raw share (yoToken) balance |
| `getUserPosition(vault, account)` | `Promise<UserVaultPosition>` | `{ shares, assets }` |
| `getAllowance(token, owner, spender)` | `Promise<TokenAllowance>` | ERC-20 allowance |
| `hasEnoughAllowance(token, owner, spender, amount)` | `Promise<boolean>` | Quick check |

### Write Actions (wallet required)

| Method | Returns | Description |
|--------|---------|-------------|
| `approve(token, amount, spender?)` | `Promise<{ hash }>` | Approve. Spender defaults to Gateway |
| `approveMax(token, spender?)` | `Promise<{ hash }>` | Approve uint256.max |
| `deposit(params)` | `Promise<{ hash, shares }>` | Deposit via Gateway |
| `redeem(params)` | `Promise<{ hash, assets }>` | Redeem via Gateway |

**Deposit params:**
```typescript
{
  vault: Address
  amount: bigint
  recipient?: Address      // defaults to wallet account
  slippageBps?: number     // default: 50 (0.5%)
  partnerId?: number       // default: from client config
}
```

**Redeem params:**
```typescript
{
  vault: Address
  shares: bigint
  recipient?: Address
  slippageBps?: number     // default: 50
  minAssetsOut?: bigint    // override slippage calc
  partnerId?: number
}
```

### Prepared Transactions (for Safe / AA wallets)

No wallet or private key needed. Returns `{ to, data, value }`.

```typescript
client.prepareApprove({ token, amount, spender? })     // sync, no RPC
await client.prepareDeposit({ vault, amount, recipient }) // async, queries gateway
await client.prepareRedeem({ vault, shares, recipient })  // async
```

### Gateway Quotes

```typescript
client.quotePreviewDeposit(vault, assets)
client.quotePreviewRedeem(vault, shares)
client.quotePreviewWithdraw(vault, assets)
client.quoteConvertToAssets(vault, shares)
client.quoteConvertToShares(vault, assets)
client.getShareAllowance(vault, owner)
client.getAssetAllowance(vault, owner)
```

### REST API Methods (off-chain, no RPC)

```typescript
client.getVaultSnapshot(vault)           // TVL, yield, share price
client.getVaultYieldHistory(vault)       // TimeseriesPoint[]
client.getVaultTvlHistory(vault)         // TimeseriesPoint[]
client.getUserHistory(vault, user, limit?)   // UserHistoryItem[]
client.getUserPerformance(vault, user)   // realized/unrealized P&L
client.getPendingRedemptions(vault, user)    // PendingRedeem
client.getVaultPendingRedeems(vault)     // PendingRedeem
```

### Transaction Helpers

```typescript
client.waitForTransaction(hash)      // Promise<TransactionReceipt>
client.waitForRedeemReceipt(hash)    // Promise<RedeemReceipt> — includes `instant` boolean
client.setWalletClient(walletClient) // swap wallet at runtime
```

### Merkl Rewards (Base only)

```typescript
client.getMerklCampaigns({ status?: 'LIVE' | 'PAST' })
client.getClaimableRewards(user)         // preferred
client.hasMerklClaimableRewards(rewards)
client.getMerklTotalClaimable(rewards)   // Map<token, amount>
client.claimMerklRewards(chainRewards)
```

### Utilities

```typescript
import {
  VAULTS,
  getVaultsForChain,
  getVaultByAddress,
  YO_GATEWAY_ADDRESS,
  parseTokenAmount,
  formatTokenAmount
} from '@yo-protocol/core'

const baseVaults = getVaultsForChain(8453)
const vault = getVaultByAddress('0x0000000f2eb9f69274678c76222b35eec7588a65')
const raw = parseTokenAmount('100', 6)    // 100_000_000n
const human = formatTokenAmount(100000000n, 6)  // "100"
```

---

## CLI Tool: `@yo-protocol/cli`

Designed for agents, bots, and scripts. All output is JSON.

### Installation

```bash
npm install @yo-protocol/cli
# binary: yo (or npx yo)
```

### Key Commands

```bash
# Discovery
yo info vaults                              # list all vaults
yo info resolve yoETH                       # resolve vault ID to config

# On-chain reads
yo read vault-state --vault yoUSD --rpc-url $RPC
yo read position --vault yoUSD --account 0x...
yo read preview-deposit --vault yoUSD --amount 100
yo read preview-redeem --vault yoUSD --shares 50

# Build transaction calldata (no private key needed)
yo prepare approve --token 0x... --amount 1000 --decimals 6
yo prepare deposit --vault yoUSD --amount 1000 --recipient 0x...
yo prepare redeem --vault yoUSD --shares 100 --recipient 0x...

# REST API
yo api vault-snapshot --vault yoETH
yo api yield-history --vault yoUSD

# Machine-readable schema
yo schema                                   # full CLI schema for dynamic agent tooling
```

**Output format:**
```json
{ "ok": true, "result": { ... } }
{ "ok": false, "error": { "code": "...", "message": "..." } }
```

---

## Complete Workflow Examples

### Deposit

```typescript
import { createYoClient, VAULTS, parseTokenAmount, YO_GATEWAY_ADDRESS } from '@yo-protocol/core'

const client = createYoClient({ chainId: 8453, walletClient })
const vault = VAULTS.yoUSD
const token = vault.underlying.address[8453]
const amount = parseTokenAmount('100', vault.underlying.decimals)

// 1. Check vault is accepting deposits
if (await client.isPaused(vault.address)) throw new Error('Vault paused')

// 2. Approve if needed
if (!await client.hasEnoughAllowance(token, wallet.account.address, YO_GATEWAY_ADDRESS, amount)) {
  const { hash } = await client.approve(token, amount)
  await client.waitForTransaction(hash)  // MUST wait before deposit
}

// 3. Deposit
const result = await client.deposit({ vault: vault.address, amount })
console.log('TX:', result.hash, 'Shares:', result.shares)
```

### Redeem

```typescript
const shares = await client.getShareBalance(vault.address, userAddress)

const result = await client.redeem({ vault: vault.address, shares })
const receipt = await client.waitForRedeemReceipt(result.hash)

if (receipt.instant) {
  console.log('Received:', receipt.assetsOrRequestId, 'assets')
} else {
  console.log('Queued — check back in up to 24h')
  const pending = await client.getPendingRedemptions(vault.address, userAddress)
}
```

### For Safe / Multisig Wallets

```typescript
const client = createYoClient({ chainId: 1 })  // no wallet needed

const approveTx = client.prepareApprove({
  token: vault.underlying.address[1],
  amount: parseTokenAmount('1000', 6),
})

const depositTx = await client.prepareDeposit({
  vault: vault.address,
  amount: parseTokenAmount('1000', 6),
  recipient: safeAddress,  // required for prepare methods
})

// Submit { to, data, value } to Safe SDK or AA bundler
```

---

## Critical Gotchas

1. **Always separate approve → wait → deposit**. Never use deprecated `depositWithApproval()`
2. **Cross-chain token addresses differ** — use `VAULTS[id].underlying.address[chainId]`
3. **Default slippage is 50 bps (0.5%)** — override with `slippageBps`
4. **Redeems can be instant or queued** — always check `receipt.instant`
5. **Gateway is the spender** — approve to `YO_GATEWAY_ADDRESS`, not the vault
6. **Default partnerId is 9999** (unattributed)
7. **`prepareDeposit` / `prepareRedeem` require explicit `recipient`**
8. **Merkl rewards exist only on Base** (chainId 8453)

---

## REST API Reference

Base URL: `https://api.yo.xyz`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/vault/{network}/{vaultAddress}` | GET | Current TVL, yield, allocation |
| `/api/v1/vault/pending-redeems/{network}/{vaultAddress}` | GET | Pending redeem status |
| `/api/v1/vault/yield/timeseries/{network}/{vaultAddress}` | GET | Historical yield |
| `/api/v1/vault/tvl/timeseries/{network}/{vaultAddress}` | GET | Historical TVL |

`{network}`: `ethereum` or `base`
