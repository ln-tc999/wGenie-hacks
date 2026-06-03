# Deploy Plan — WalletGenie Treasury on Mantle

## Overview

Kita deploy **WalletGenie Treasury** ke Mantle L2 untuk Turing Test Hackathon 2026.
Dua bagian: **smart contracts** + **frontend/infra**.

---

## Phase 1: Smart Contracts (Mantle Sepolia Testnet)

### Prerequisites

| Item | Sumber |
|------|--------|
| Private key + MNT testnet | Faucet: https://faucet.sepolia.mantle.xyz |
| Contract source code | `external/wgenie-fusion` (repo private — perlu akses) |
| RPC URL | `https://rpc.sepolia.mantle.xyz` |
| Block explorer | `https://explorer.sepolia.mantle.xyz` |

### Step 1.1 — Deploy Core Infrastructure

Jalankan script yang sudah dibuat:

```bash
cd packages/hardhat-tests
cp .env.example .env
# isi: RPC_URL_MANTLE_SEPOLIA + DEPLOYER_PRIVATE_KEY

pnpm exec hardhat run scripts/deploy-mantle.ts --network mantleSepolia
```

**Output:** `deployed-mantle.json` berisi address:
- FusionFactory
- ERC4626SupplyFuse (Slot 1-4)
- ERC4626BalanceFuse (Slot 1-4)
- UniversalTokenSwapperFuse
- ZeroBalanceFuse

### Step 1.2 — Update SDK dengan Address Baru

Setelah deploy, update:

1. **`packages/sdk/src/fusion.addresses.ts`**
   - Tambah entry `[mantle.id]` untuk FusionFactory + semua fuses

2. **`plasma-vaults.json`**
   - Tambah vault entries chainId 5000:
   ```json
   {
     "name": "WalletGenie Mantle Treasury",
     "address": "<dari hasil clone vault>",
     "chainId": 5000,
     "protocol": "wGenie Fusion",
     "tags": ["wgenie-cfo", "mantle"],
     "startBlock": 0,
     "url": "https://explorer.sepolia.mantle.xyz/address/<address>",
     "apps": ["wgenie"]
   }
   ```

3. **`packages/web/src/wgenie-cfo/hooks/use-treasury-positions.ts`**
   - Update MANTLE_VAULTS dengan addresses Mantle asli

### Step 1.3 — Clone Vault via Factory

Buat vault pertama via FusionFactory.clone(). Address vault ini jadi:

- **Landing page VAULT_URL** → `/vaults/5000/<vault-address>`
- **App-config nav item** → url yang sama
- **TreasuryOverview** → render CFO dashboard untuk vault ini

### Step 1.4 — Verify Contracts

```bash
npx hardhat verify --network mantleSepolia <FUSION_FACTORY> [args]
```

---

## Phase 2: Backend Infra

### Step 2.1 — Ponder Indexer

| Variable | Value |
|----------|-------|
| `PONDER_RPC_URL_MANTLE` | `https://rpc.sepolia.mantle.xyz` |
| Database | Supabase project (atau local via `pnpm db:start`) |

Setelah vault addresses masuk `plasma-vaults.json`, Ponder otomatis index.
Run:

```bash
pnpm dev:ponder
```

**Deploy target:** Railway / Fly.io (Postgresql + Ponder dalam satu service).

### Step 2.2 — Mastra AI Agent

| Variable | Value |
|----------|-------|
| `MANTLE_RPC_URL` | `https://rpc.sepolia.mantle.xyz` |
| `OPENROUTER_API_KEY` | dari openrouter.ai |
| `MASTRA_API_KEY` | generate via `openssl rand -hex 32` |

Build & deploy:

```bash
pnpm --filter @wgenie/fusion-mastra build
# Deploy .mastra/output/ ke Railway / Render / Fly.io
```

**Deploy target:** Railway (easiest, built-in Node support).

---

## Phase 3: Frontend

### Step 3.1 — Web App (Next.js)

**Env vars** (`.env.local`):

```env
# Mantle RPC
NEXT_PUBLIC_RPC_URL_MANTLE=https://rpc.sepolia.mantle.xyz

# Mastra (backend AI)
MASTRA_SERVER_URL=https://<mastra-app>.railway.app
MASTRA_API_KEY=<sama dengan mastra>

# Supabase (Ponder data)
PONDER_DB_SUPABASE_URL=<supabase-url>
PONDER_DB_SUPABASE_SERVICE_ROLE_KEY=<key>
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key>
```

**Build:**

```bash
pnpm build:web
```

**Deploy target:** Vercel (recommended, integrasi sempurna dg Next.js).
Set env vars di Vercel dashboard, deploy dari GitHub.

### Step 3.2 — Landing Page

Update `VAULT_URL` di landing page dan `app-config.ts` dengan vault address real hasil clone.

---

## Phase 4: Final Checklist

### Smart Contracts
- [ ] FusionFactory deployed & verified ✅
- [ ] Fuses deployed (4 supply + 4 balance + 1 swap) ✅
- [ ] Minimal satu vault di-clone via factory ✅
- [ ] Contract verified di Mantle Explorer ✅

### Backend
- [ ] Ponder indexing vault Mantle ✅
- [ ] Mastra agent running ✅
- [ ] API key protection enabled ✅

### Frontend
- [ ] Web app builds ✅
- [ ] Vault detail page renders ✅
- [ ] CFO agent chat works ✅
- [ ] Landing page menunjuk ke vault Mantle ✅

### Submission (DoraHacks — deadline June 15)
- [ ] GitHub repo public ✅
- [ ] README dengan setup instructions ✅
- [ ] Demo video ≥ 2 menit ⬜
- [ ] Live demo URL (Vercel) ⬜
- [ ] Contract address + explorer link di README ⬜

---

## Timeline Estimasi

| Phase | Estimasi |
|-------|----------|
| Deploy contracts | 30 menit (dengan script) |
| Update SDK / config | 30 menit |
| Ponder setup | 20 menit |
| Mastra deploy | 20 menit |
| Frontend deploy | 15 menit |
| Demo video + submission | 1-2 jam |

Total: ~3-4 jam.
