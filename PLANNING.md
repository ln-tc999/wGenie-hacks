# WalletGenie CFO — Hackathon Execution Plan

> **Hackathon:** The Turing Test 2026 — Phase II: AI Awakening  
> **Track:** Track 6 (Agentic Economy — Byreal Toolkit)  
> **Network:** Mantle L2 (Sepolia testnet 5003 → Mainnet 5000)  
> **Deadline:** June 15, 2026

---

## Status Saat Ini

### ✅ Sudah Selesai

| Item | Detail |
|------|--------|
| **WalletGenieTreasury contract** | Deployed di Mantle Sepolia `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4` |
| **Foundry setup** | `foundry.toml`, `forge build`, `forge script` deploy |
| **Treasury funded** | 1 MNT deposited |
| **Mantle Sepolia infra** | 5003 added di: Mastra viem-clients, env, web chains.config, wagmi-provider, rpc/clients |
| **Web build** | ✅ pass |
| **Landing page** | Link ke vault 5003 real address |
| **Vault page** | TreasuryOverview render (tags `wgenie-cfo`) |
| **CFO agent tool** | `readWalletGenieTreasuryTool` — baca MNT balance + user deposit |
| **Chat route** | Default chainId 5003 |

### ❌ Belum / Kurang

| Item | Status | Notes |
|------|--------|-------|
| **Byreal tools** | Stub | `getTopPools`, `analyzePool`, `simulateSwap`, `executeSwap` throw error |
| **Merchant Moe swap** | Stub | `createMerchantMoeSwapActionTool` throw `not implemented` |
| **Agni Finance / Aave / Fluxion** | ✗ | Belum ada integration |
| **Agent workflow (read → propose)** | Sebagian | Bisa read, belum bisa generate calldata |
| **Execute flow** | ✗ | User gak bisa execute dari UI |
| **Ponder indexer** | ✗ | Treasury events gak di-index |
| **Treasury positions** | Sebagian | `MANTLE_VAULTS` cuma support 8453 (Base) |

---

## 🔴 Critical — Wajib Ada di Demo

### 1. Byreal Toolkit Integration

> **Why:** Track 6 requirement. Byreal Agent Skills & RealClaw adalah inti track ini.

**Files affected:**
- `packages/mastra/src/tools/byreal/`
- `packages/mastra/src/agents/wgenie-cfo-agent.ts`

**What:**
- Install `@byreal-io/byreal-cli` — `npm install -g @byreal-io/byreal-cli`
- Implement `getTopPoolsTool` — panggil `byreal-cli pools list --sort-field apr24h -o json`
- Implement `analyzePoolTool` — panggil `byreal-cli pools analyze <address> -o json`
- Implement `simulateSwapTool` — panggil `byreal-cli swap execute ... --dry-run -o json`
- `executeSwapTool` — panggil `byreal-cli swap execute ... --confirm`
- Update agent instructions: CFO bisa suggest cross-chain strategy (Mantle treasury + Solana Byreal)

**Demo flow:**
1. User: "what pools are hot on Byreal?"
2. Agent: calls `getTopPoolsTool` → "Top 3 pools: SOL/USDC (45% APR)..."

---

### 2. Merchant Moe Swap Action

> **Why:** Satu-satunya DEX integration yang udah ada tool stub-nya. Treasury `execute()` butuh calldata.

**Files affected:**
- `packages/mastra/src/tools/wgenie-cfo/create-swap-action.ts`
- `packages/mastra/src/tools/wgenie-cfo/types.ts`

**What:**
- Baca Merchant Moe Router address + ABI dari `mantle-reesources.md` / docs
- Generate `execute()` calldata:
  ```
  treasury.execute(
    merchantMoeRouter,
    0,
    abi.encodeWithSignature("swapExactTokensForTokens(...)")
  )
  ```
- Output: `TransactionProposal` with `{ target, value, data }`

**Demo flow:**
1. User: "swap 0.5 MNT to USDC"
2. Agent: calls `createMerchantMoeSwapActionTool`
3. Returns calldata → user bisa execute via UI

---

### 3. Agent Workflow — Read → Propose → Simulate

> **Why:** Agent harus bisa ngasih proposal yang actionable, bukan cuma ngomong.

**Files affected:**
- `packages/mastra/src/tools/wgenie-cfo/create-swap-action.ts`
- `packages/web/src/app/api/cfo/treasury/chat/route.ts`
- `packages/web/src/wgenie-cfo/components/treasury-overview.tsx`
- `packages/web/src/wgenie-cfo/components/agent-chat.tsx`

**What:**
- Agent returns structured proposal: `{ action: "swap", from: "MNT", to: "USDC", amount: "0.5", calldata: "0x...", target: "0x...", value: "0" }`
- UI renders proposal as action card (not just text)
- "Execute" button on the card → calls `treasury.execute()`

**UI components needed:**
- `TransactionProposalCard` — show what will happen
- `ExecuteButton` — calls wallet to sign + send

---

## 🟡 High — Demo Jadi Lebih Kuat

### 4. Yield Protocol Integration

> **Why:** Hackathon brief mentions Agni Finance, Fluxion, Aave V3. Need at least ONE working.

**Option A — Aave V3 on Mantle (termudah):**
- Aave V3 sudah deployed di Mantle
- Generate calldata buat `supply()` via treasury `execute()`
- Agent bisa: "deposit USDC ke Aave V3, earn 5.2% APY"

**Option B — Agni Finance:**
- Part of Mantle Agent Scaffold
- Lending protocol — deposit/borrow
- Agent: "supply 100 USDC ke Agni Finance"

**Files affected:**
- `packages/mastra/src/tools/wgenie-cfo/create-allocation-action.ts` — implement this stub
- New: aave / agni address constants

---

### 5. Treasury Dashboard — Real Positions

> **Why:** UI sekarang kosong karena `MANTLE_VAULTS` cuma support 8453.

**Files affected:**
- `packages/web/src/wgenie-cfo/hooks/use-treasury-positions.ts`

**What:**
- Tambah Mantle mainnet (5000) entries di `MANTLE_VAULTS`:
  - USDY (USDC), mETH (WETH), cmBTC (cbBTC), MNT (EURC)
  - Address di Mantle mainnet: cek dari docs/deployed contracts
- Atau: untuk demo Sepolia, deploy mock vault addresses

---

### 6. Execute Flow dari Agent ke Treasury

> **Why:** User harus bisa execute proposal dari UI.

**Files affected:**
- `packages/web/src/wgenie-cfo/components/treasury-chat.tsx` atau file chat baru
- `packages/web/src/wgenie-cfo/hooks/use-treasury-actions.ts` — baru

**What:**
- Backend manager wallet: EOA yang punya `MANAGER_ROLE` di treasury
- Atau: user execute via `execute()` — tapi `onlyManager` — jadi perlu manager approval
- Simplest: user adalah owner, bisa set manager sementara
- Atau demo pakai `cast send` / wagmi write contract

---

## 🟢 Medium — Polish

### 7. Ponder Indexer

> **Why:** Index treasury events biar dashboard bisa show history.

**Files affected:**
- `packages/ponder/ponder.config.ts`
- `packages/ponder/ponder.schema.ts`
- `packages/ponder/src/` — new event handler

**What:**
- Tambah `mantleSepoliaTestnet` chain di Ponder config
- Buat ABI untuk `WalletGenieTreasury` events: `Deposited`, `Withdrawn`, `Executed`
- Index Deposit/Withdraw events
- Index TreasuryExecuted events (for agent action history)

---

### 8. Landing Page Content

> **Why:** Landing page masih ngomongin "sendok" yang gak relevan.

**Files affected:**
- `packages/web/src/wgenie-cfo/components/landing-page.tsx`

**What:**
- Update fitur descriptions sesuai real capabilities
- Ganti "Four vaults, four deposits" → "One treasury, AI-managed"
- Update tech stack: tambah Byreal, hapus irrelevant items

---

### 9. Deploy ke Mantle Mainnet

> **Why:** Judge bakal liat testnet. Mainnet lebih impressive.

**Files affected:**
- `packages/hardhat-tests/script/Deploy.s.sol` — argumen chain-id
- `packages/hardhat-tests/.env` — `RPC_URL_MANTLE_MAINNET`
- SDK addresses — update ke mainnet address

**What:**
- Dapat MNT buat gas di Mantle mainnet
- Deploy ulang WalletGenieTreasury
- Update SDK addresses
- Butuh: test MNT → jembatan dari Ethereum atau beli

---

## Resource Dependencies

| Resource | Status | Sumber |
|----------|--------|--------|
| Byreal CLI | 🔴 Belum install | `npm install -g @byreal-io/byreal-cli` |
| Merchant Moe Router ABI | 🔴 Belum | `mantle-reesources.md` → docs.merchantmoe.com |
| Aave V3 Mantle address | 🔴 Belum | docs.aave.com / mantle-reesources.md |
| Agni Finance address | 🔴 Belum | mantle-reesources.md |
| Manager EOA + private key | 🔴 Belum | Generate baru |
| MNT mainnet buat deploy | 🔴 Belum | Bridge dari ETH |

---

## Recommended Order

```
Phase 1 (Critical — Demo Flow)
  ├── 1. Byreal tools: fetch pools, simulate swap
  ├── 2. Merchant Moe: generate execute() calldata
  └── 3. Agent workflow: proposal card + execute button

Phase 2 (High — Demo Quality)
  ├── 4. Aave V3 or Agni: deposit yield
  ├── 5. Treasury dashboard positions
  └── 6. Execute from UI

Phase 3 (Medium — Polish)
  ├── 7. Ponder indexer
  ├── 8. Landing page
  └── 9. Mainnet deploy
```
