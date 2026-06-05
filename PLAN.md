# WalletGenie CFO — Hackathon Execution Plan

## Strategi: Keep Mastra ✅ (Terbukti Works)

**Keputusan final**: Mastra dipakai, model gateway works.

### Kenapa:
- Mastra gateway berhasil parse `nvidia/meta/llama-3.3-70b-instruct` → `https://integrate.api.nvidia.com/v1/chat/completions`
- Model name diterjemahin bener ke `meta/llama-3.3-70b-instruct`
- API key NVIDIA dipake bener
- Error sebelumnya cuma karena `meta/llama-3.1-70b-instruct` broken di sisi NVIDIA (internal server error)

### Model yang sudah verified working:
- `meta/llama-3.3-70b-instruct` ✅ (recommended, yang dipake di `.env`)
- `meta/llama-3.1-8b-instruct` ✅
- **JANGAN** pake `meta/llama-3.1-70b-instruct` (broken, 500 error)

---

## Phase 1: Quick Test (Kuyng — mulai dari sini)

1. **Pull latest + install**
   ```bash
   git pull
   pnpm install
   ```

2. **Start mastra**
   ```bash
   pnpm dev:mastra
   ```

3. **Test agent**
   ```bash
   curl -X POST http://localhost:4111/chat/wgenieCfoAgent \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-key-wgenie-2024" \
     -d '{"messages":[{"role":"user","content":"what is my treasury balance?"}],"stream":false}'
   ```

4. **Test with web UI**
   ```bash
   pnpm dev:web
   ```
   Buka `http://localhost:3000` → login wallet → chat "show my treasury"

5. **Expected**: Agent bales pake data dari `readWalletGenieTreasuryTool` + `readTreasuryBalancesTool` (balances on-chain).

---

## Phase 2: Merchant Moe Integration (Mainnet Only)

**Problem**: Merchant Moe ga ada di Mantle Sepolia testnet. Hanya mainnet (5000).

**Solusi**: Agent lihat treasury di Sepolia, tapi kalo user mau swap → generate proposal buat dipake di mainnet. Atau deploy ulang treasury di mainnet.

### TODO:
- [ ] Dapetin `Router` address Merchant Moe di Mantle mainnet
- [ ] ABI Router untuk `swapExactTokensForTokens` atau function terkait
- [ ] Buat `encodeMerchantMoeSwap()` — encode calldata untuk treasury `execute()`
- [ ] Update `createMerchantMoeSwapActionTool` — pake address mainnet

### Referensi:
- Merchant Moe docs: https://docs.merchantmoe.com/
- Mantle chain: 5000 (mainnet)
- Treasury `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4` (Sepolia)

---

## Phase 3: Byreal Integration (Solana DEX)

Byreal CLI udah terinstall (`@byreal-io/byreal-cli@0.3.6`).

### TODO:
- [ ] Setup Solana wallet (byreal need wallet for TX)
- [ ] Test Byreal CLI commands (quote, swap)
- [ ] Integrasi tool `getTopPoolsTool`, `analyzePoolTool`, `simulateSwapTool`, `executeSwapTool`
- [ ] Format output sebagai action card di chat

### Referensi:
- Byreal docs: perlu dicek dari CLI `npx @byreal-io/byreal-cli --help`
- Byreal tools udah ada di agent definition — tinggal implementasi backendnya

---

## Phase 4: UI Polish ✅

### DONE:
- [x] Treasury overview card (balance, deposits chart)
- [x] Chat interface — streaming response
- [x] Action cards (Proposal → Execute / Cancel buttons)
- [x] Loading states
- [x] Error handling (model down, TX failed, insufficient balance)
- [x] Ponder-based transaction history side panel

### Chat Route:
- `packages/web/src/app/api/cfo/treasury/chat/route.ts` — proxy ke Mastra `POST /chat/wgenieCfoAgent`
- Auth via wallet (SIWE) + X-API-Key internally
- Response format: Mastra SSE stream (bisa diparse di frontend)

---

## Phase 5: Demo Prep

### TODO:
- [ ] Fund treasury dengan test token (Sepolia)
- [ ] Buat test script / flow yang bisa ditunjukin:
  1. Login wallet
  2. "Show my treasury balance"
  3. "Swap 0.1 MNT for USDC"
  4. Agent propose action → Execute button
  5. TX confirmed
- [ ] Siapkan slide / deck

---

## Known Issues / Notes

### NVIDIA Models:
- `meta/llama-3.1-70b-instruct` — **BROKEN** (500 Internal Server Error)
- `meta/llama-3.3-70b-instruct` — ✅ Working (recommended, currently configured)
- `meta/llama-3.1-8b-instruct` — ✅ Working (lebih cepet, kurang pinter)
- Kalau mau ganti model: edit `MODEL` di `packages/mastra/.env` → `nvidia/<model-name>`

### Mastra Gateway:
File: `packages/mastra/src/env.ts`
```ts
// model = env.MODEL — string "nvidia/meta/llama-3.3-70b-instruct"
// Mastra gateway otomatis:
//   1. Parse "nvidia/" prefix → pake provider config nvidia
//   2. Parse model name "meta/llama-3.3-70b-instruct" → kirim ke NVIDIA API
//   3. Pake NVIDIA_API_KEY dari env
```
Udah verified: gateway routing works ✅

### Treasury:
- Address: `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4` (Mantle Sepolia 5003)
- Owner: `0x3a8d93D5F52a26689b075A49E67F4f8924BeC84B` (EOA)
- Balance: 1 MNT (testnet, dari faucet)
- Fungsi: `deposit()` (public), `execute()` (manager only)

### Foundry:
- Pakai `~/.foundry/bin/forge` untuk smart contract ops
- `forge` (tanpa path) adalah opencode AI tool — **JANGAN dipake** untuk Foundry commands

### Ponder Indexer:
- Jalan di `http://localhost:42069`
- Butuh Supabase lokal: `pnpm db:start`
- Tapi untuk demo CFO, Ponder ga wajib — tool langsung call RPC

---

## File Reference

| Path | Fungsi |
|------|--------|
| `packages/web/` | Next.js frontend + API routes |
| `packages/mastra/` | Mastra agents + tools |
| `packages/mastra/src/agents/wgenie-cfo-agent.ts` | Agent definition (tools, model, instructions) |
| `packages/mastra/src/env.ts` | Model provider setup |
| `packages/mastra/.env` | API keys, model config |
| `packages/web/src/app/api/cfo/treasury/chat/route.ts` | Web → Mastra proxy |
| `packages/ponder/` | Event indexer (optional for demo) |
| `packages/hardhat-tests/contracts/` | Smart contracts |
| `packages/sdk/` | ABIs + helpers |
| `PLAN.md` | This document |
| `mantle-reesources.md` | Mantle network config + DeFi protocols |
