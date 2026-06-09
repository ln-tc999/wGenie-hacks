# WalletGenie CFO — Hackathon Execution Plan

## Arsitektur: No More Mastra ✅ (Sudah Dihapus)

**Mastra udah dihapus** (`packages/mastra/`). CFO agent sekarang jalan langsung di **Next.js API route** (`packages/web/src/app/api/cfo/treasury/chat/route.ts`).

### Stack Baru:
- **LLM**: `@ai-sdk/openai` → NVIDIA API (`meta/llama-3.3-70b-instruct`)
- **Agent loop**: `ai` SDK `streamText` dengan `maxSteps` (auto tool calling loop)
- **Tools**: Inline di route handler (no framework abstraction)
- **Streaming**: `streamText` → `toDataStreamResponse()` (SSE, compatible dengan `useChat` frontend)
- **Frontend**: Sama, pake `@ai-sdk/react` `useChat` + `DefaultChatTransport`

### Perubahan:
| Before | After |
|--------|-------|
| `packages/mastra/` agent server | API route langsung di web |
| Mastra gateway routing NVIDIA | `createOpenAI({ baseURL, apiKey, compatibility })` |
| `@mastra/core/tools` createTool | `ai` SDK `tool({...})` |
| Proxy via `fetch(MASTRA_URL)` | Langsung `streamText(...)` di handler |
| `MASTRA_API_KEY` auth | Langsung dari env |

---

## Phase 1: Quick Test

1. **Install + start web**
   ```bash
   pnpm install && pnpm dev:web
   ```

2. **Test agent**
   ```bash
   curl -X POST http://localhost:3000/api/cfo/treasury/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"what is my treasury balance?"}],"chainId":5003,"vaultAddress":"0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4","callerAddress":"0x3a8d93D5F52a26689b075A49E67F4f8924BeC84B"}'
   ```

3. **Buka UI**: `http://localhost:3000` → login wallet → chat

---

## Phase 2: Merchant Moe Integration (Mainnet Only)

- Route handler pake `getPublicClient(chainId)` → multicall
- Swap action udah implementsi di route handler
- **TODO**: Dapetin Router address yg benar di Mantle mainnet

### Referensi:
- Merchant Moe docs: https://docs.merchantmoe.com/
- Sudah ada di route handler: `createMerchantMoeSwapAction` tool

---

## Phase 3: Byreal Integration (Solana DEX)

Byreal tools udah ada di route handler (getTopPools, analyzePool, simulateSwap, executeSwap).

### TODO:
- [ ] Setup Solana wallet untuk TX
- [ ] Test Byreal CLI commands
- [ ] Tool output → action card di chat

---

## Phase 4: UI Polish

### Route handler udah support:
- ✅ Streaming response (SSE via `toDataStreamResponse()`)
- ✅ Tool calling loop (maxSteps: 10)
- ✅ Treasury reads + swap/allocation/withdraw proposals
- ✅ Byreal tools

### TODO:
- [ ] Treasury overview card (balance, deposits)
- [ ] Chat interface sudah ada (pake `AgentChat` component)
- [ ] Action cards -> Execute button udah ada (`TreasuryTransactionProposal`)
- [ ] Error handling (model down, TX failed, insufficient balance)

---

## Key Files

| Path | Fungsi |
|------|--------|
| `packages/web/src/app/api/cfo/treasury/chat/route.ts` | **CFO Agent API route** — model, tools, streaming |
| `packages/web/src/lib/types/wgenie-cfo.ts` | TreasuryTransactionProposalOutput type |
| `packages/web/src/lib/types/alpha.ts` | Alpha project types (legacy) |
| `packages/web/src/wgenie-cfo/components/treasury-transaction-proposal.tsx` | Execute button UI |
| `packages/web/src/wgenie-cfo/components/treasury-overview.tsx` | Chat + dashboard page |
| `packages/web/src/alpha/agent-chat.tsx` | Reusable chat component |
| `packages/web/.env.local` | API keys, RPC URLs |

---

## Known Issues / Notes

### Model:
- `meta/llama-3.3-70b-instruct` — ✅ Working (currently configured)
- `meta/llama-3.1-70b-instruct` — **BROKEN** (NVIDIA server 500 error)
- Untuk ganti model: edit model name di route handler
- LLM provider: NVIDIA (`createOpenAI({ baseURL: 'https://integrate.api.nvidia.com/v1' })`)

### Treasury:
- Address: `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4` (Mantle Sepolia 5003)
- Owner: `0x3a8d93D5F52a26689b075A49E67F4f8924BeC84B`
- Balance: 1 MNT

### Route Handler Notes:
- Tool execution otomatis via `streamText` — model decide kapan panggil tool, SDK execute + feed hasilnya balik
- Output tool berupa `treasury-transaction-proposal` (untuk swap/allocation/withdraw) atau `treasury-balance` / `balance-check` (untuk read)
- Frontend render proposal via `TreasuryToolRenderer` → `TreasuryTransactionProposal` component

### Environment Variables (`.env.local`):
```
NVIDIA_API_KEY=nvapi-...       # Required
MANTLE_SEPOLIA_RPC_URL=...     # Required
MANTLE_RPC_URL=...             # For mainnet operations
```

### Removed:
- `packages/mastra/` — deleted
- `@wgenie/fusion-mastra` dep — removed from web
- `@mastra/core`, `@mastra/ai-sdk` — removed from web
- `dev:mastra` script — disabled

### Foundry:
- Pakai `~/.foundry/bin/forge` untuk smart contract ops
- `forge` (tanpa path) adalah opencode AI tool — **JANGAN dipake** untuk Foundry commands
