# WalletGenie — Full Plan

> The Turing Test 2026 · Track 6: Agentic Economy
> Deadline: June 15

---

## I. UI Redesign — "Premium CFO Dashboard"

### Design Direction
- **Tone**: Dark, premium, financial — bayangkan Bloomberg Terminal meets Apple design
- **Color**: Mantle gradient (#000→#ffd15c gold accent), glassmorphism cards, subtle glow
- **Typography**: Inter/Geist mono untuk numbers, sans-serif untuk body

### Pages & Components

| Page | What | Priority |
|------|------|----------|
| **Dashboard** | Portfolio overview — total value, P&L, APY, risk score. Dominant chart. | P0 |
| **Treasury** | Token balances with USD, protocol breakdown, history chart | P0 |
| **Agent Chat** | Full-page embedded chat — kayak ChatGPT tapi dalam app | P0 |
| **Strategy** | Active strategies, performance tracking, proposal history | P1 |
| **Settings** | Risk limits, guardrails, relayer config | P1 |

### Key UI Improvements
- **Chat jadi full-page** (bukan modal/sidebar) — biar feel-nya professional chat app
- **Animated transitions** — framer-motion buat page transitions, number counters
- **Data viz** — recharts stacked area buat portfolio history, donut chart buat allocation
- **Mobile responsive** — lumayan penting buat judges yang buka dari HP

---

## II. CFO Agent — From Propose to Execute

### Phase 1: Real Execution (P0 — Before Hackathon)

```
User         Agent         Relayer           Treasury       Blockchain
 │             │              │                  │              │
 │ "supply     │              │                  │              │
 │  1000 USDC" │              │                  │              │
 │────────────>│              │                  │              │
 │             │──Propose─────│                  │              │
 │<──Preview───│              │                  │              │
 │──Confirm───>│              │                  │              │
 │             │──Execute────>│                  │              │
 │             │              │──execute(data)──>│              │
 │             │              │                  │──tx─────────>│
 │             │              │<──tx hash────────│              │
 │<──Result────│              │                  │              │
```

#### Backend Relayer Service
```bash
packages/relayer/
├── src/
│   ├── route.ts          # Next.js API — /api/relayer/execute
│   ├── wallet.ts         # EOA manager (encrypted key via KMS/env)
│   └── guard.ts          # Pre-execution checks (limit, whitelist)
├── .env.local            # RELAYER_PRIVATE_KEY, TREASURY_ADDRESS
└── ...
```

#### On-Chain Guardrails (WalletGenieTreasury v2)
```solidity
struct Guardrail {
    uint256 dailyLimit;       // Max value per day
    uint256 maxPerTx;         // Max value per transaction
    uint256 usedToday;        // Tracked internally
    uint256 lastReset;        // Block.timestamp / 1 days
    mapping(address => bool) whitelistedTargets; // Only these protocols
    bool paused;              // Emergency stop
}
```

#### Agent Integration
- Agent generate calldata → `POST /api/relayer/execute` with tx data
- Relayer checks guardrails → sign + submit tx → return hash
- Agent stream tx hash + confirmation to chat

### Phase 2: Guardrails UI (P0 — Before Hackathon)

Settings page where user can:
- Set daily limit (USD)
- Whitelist protocols (Merchant Moe, Aave, etc.)
- Set max slippage per protocol
- Pause/resume relayer
- View tx history + status

### Phase 3: Monitoring & Alerts (P1 — Stretch)

- Agent monitor Aave APY changes → push notification
- Agent detect large withdrawals from protocol → warn user
- Market condition summary — "MNT turun 5% dalam 24 jam, worth to rebalance?"

---

## III. DME (Distinctive Market Edge) — What Makes Us Different

### 1. Cross-Chain Awareness
Bukan cuma Mantle. Agent bisa: "Treasury kamu $50k di Mantle, tapi ada $10k idle di Solana. Mau Byreal pool di Solana apa tarik ke Mantle?" — user belum tentu butuh, tapi **wow factor** untuk judges.

### 2. Natural Language Strategy Builder
Bukan "supply 1000 USDC", tapi:
```
User: "Bikin strategy: taruh 60% ke Aave USDC, 30% ke Merchant Moe MNT-USDC,
       10% sisanya biar liquid. Auto-rebalance seminggu sekali."
Agent: "Oke, ini flow:
  1. Swap 600 USDC via Merchant Moe → supply Aave
  2. Swap 300 USDC → MNT → add liquidity Merchant Moe
  3. Biarin 100 USDC

  Guardrails: max daily $2000, slippage 0.5%.
  Setuju?"
```
Ini **yang bikin beda** — bukan chatbot, tapi CFO yang beneran mikirin portfolio.

### 3. Risk Dashboard
- **Protocol risk score**: Aave proven vs Byreal baru launch
- **Concentration risk**: "55% portfolio di 1 pool — high risk"
- **Impermanent loss estimate**: untuk LP positions
- **Recommendation**: "Turunkan exposure Merchant Moe dari 60% ke 40%, masukin ke Aave"

---

## IV. Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Dashboard │  │ Treasury │  │   Chat   │  │Settings  │ │
│  │  page    │  │   page   │  │   page   │  │   page   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       └──────────────┴─────────────┴──────────────┘       │
│                         │ useChat                          │
│                         │ @ai-sdk/react                    │
└─────────────────────────┼──────────────────────────────────┘
                          │ POST /api/cfo/treasury/chat
                          ▼
┌──────────────────────────────────────────────────────────┐
│              API Layer (Next.js Route Handler)             │
│                                                           │
│  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │   CFO Agent       │  │     Relayer                 │   │
│  │   (chat/route)    │  │     (/api/relayer/execute)  │   │
│  │                   │  │                             │   │
│  │  • NVIDIA API     │  │  • Sign tx with EOA        │   │
│  │  • Tool handler   │  │  • Check guardrails        │   │
│  │  • SSE stream     │  │  • Submit to RPC           │   │
│  └──────────────────┘  └──────────┬──────────────────┘   │
└───────────────────────────────────┼───────────────────────┘
                                    │ execute()
                                    ▼
┌──────────────────────────────────────────────────────────┐
│              On-Chain (Mantle 5000/5003)                   │
│                                                           │
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │ WalletGenie         │  │  Guardrails (v2)           │  │
│  │ Treasury            │  │                            │  │
│  │                     │  │  • dailyLimit              │  │
│  │  • execute()        │  │  • maxPerTx                │  │
│  │  • deposit()        │  │  • whitelistedTargets      │  │
│  │  • owner/manager    │  │  • paused                  │  │
│  └────────────────────┘  └────────────────────────────┘  │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ Aave V3    │  │Merchant Moe│  │ Ponder Indexer   │   │
│  │ Pool       │  │ Router     │  │ Events → DB      │   │
│  └────────────┘  └────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## V. File Changes Summary

| Area | Files | What |
|------|-------|------|
| **UI** | `packages/web/src/wgenie-cfo/` | Redesign all components — dashboard, treasury page, settings |
| **UI** | `packages/web/src/alpha/agent-chat.tsx` | Full-page chat redesign |
| **Route** | `packages/web/src/app/api/cfo/treasury/chat/route.ts` | Add strategy builder prompt, cross-chain awareness |
| **Relayer** | `packages/web/src/app/api/relayer/execute/route.ts` | NEW — execute endpoint |
| **Relayer** | `packages/web/src/app/api/relayer/guardrails/route.ts` | NEW — read/update guardrails |
| **Contract** | `packages/hardhat-tests/contracts/WalletGenieTreasury.sol` | Add guardrails (v2) |
| **Contract** | `packages/hardhat-tests/script/Deploy.s.sol` | Deploy v2 |
| **SDK** | `packages/sdk/src/` | Aave/Byreal helpers for agent |
| **Config** | `packages/web/.env.local` | Add RELAYER_PRIVATE_KEY |

---

## VI. Demo Script (3 minutes)

1. **"WalletGenie, check my treasury"** → Agent read balances, show portfolio overview
2. **"USDC APY di Aave berapa?"** → Agent fetch Aave rates, show comparison
3. **"Supply 1000 USDC ke Aave"** → Agent propose → guardrail check → execute → tx confirmed
4. **"Bikin strategy: 60% Aave USDC, 40% Merchant Moe MNT-USDC"** → Agent build multi-step flow
5. **"Cek Byreal pool"** → Cross-chain agent research Solana pools

---

## VII. Future (Post-Hackathon)

- Multi-user treasury (DAO)
- Social recovery (no seed phrase = bank level security)
- Cross-chain automated rebalancing (LayerZero integration)
- Mobile app (React Native)
