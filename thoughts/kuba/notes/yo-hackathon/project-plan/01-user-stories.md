# YO Treasury — User Stories

## Epic 1: Vault Creation & Onboarding

### US-1.1: Create Personal Treasury Vault
**As a** new user connecting their wallet,
**I want to** create my own on-chain treasury vault with one click,
**So that** I have a personal vault to manage my yield allocations.

**Acceptance Criteria:**
- User connects wallet and selects chain (Base default)
- App calls FusionFactory.clone() with user as owner, underlying = USDC
- Vault is configured with:
  - ERC4626SupplyFuse for each YO vault market slot
  - UniversalTokenSwapperFuse for swaps
  - Balance fuses for each market
  - YO vault addresses whitelisted as substrates
  - Swap router addresses whitelisted as substrates
- User receives OWNER_ROLE, ATOMIST_ROLE, ALPHA_ROLE, FUSE_MANAGER_ROLE
- User's wallet is granted WHITELIST_ROLE (800) for deposit access — vault stays non-public
- App stores vault address locally and in URL

**Important:** Vault is NOT converted to public. This is irreversible. Instead, WHITELIST_ROLE is granted to the user's wallet address to allow deposits.

### US-1.2: Resume Existing Vault
**As a** returning user,
**I want to** reconnect to my existing treasury vault,
**So that** I can continue managing my allocations.

**Acceptance Criteria:**
- App checks if user has a vault on the connected chain (stored in localStorage or queried on-chain)
- If vault exists but has zero balance, prompt user to make their first deposit (nothing to manage without funds)
- If vault exists with balance, show portfolio dashboard as primary view
- Works across browser sessions

### US-1.3: First Deposit Into Treasury
**As a** user who just created their vault,
**I want to** make my first deposit before seeing the management interface,
**So that** I have funds to allocate.

**Acceptance Criteria:**
- After vault creation, user is guided to make their first USDC deposit
- Standard web UI form: enter amount → approve → deposit
- Only after successful first deposit does the user see the full dashboard + chat
- This ensures the user always has something to manage

---

## Epic 2: Portfolio Dashboard (Primary UI)

### US-2.1: Always-Visible Portfolio Dashboard
**As a** user with funds in my treasury,
**I want to** always see my portfolio dashboard without needing to chat with AI,
**So that** I feel safe and informed about where my funds are.

**Acceptance Criteria:**
- Dashboard is the primary view when visiting the treasury page (not chat)
- Shows:
  - Total treasury value in USD
  - Unallocated balance (USDC sitting in vault)
  - Per-YO-vault positions (shares, asset value, % of total, current APR)
  - YO vault APRs and TVL alongside positions
- Updates after every transaction
- No AI interaction needed to see this information

### US-2.2: Deposit Into Treasury (Web UI)
**As a** user,
**I want to** deposit USDC into my treasury using a standard form,
**So that** I fund my vault for allocation.

**Acceptance Criteria:**
- Standard web UI form with amount input field
- Prepares ERC20 approve + PlasmaVault.deposit() transactions
- Uses wagmi hooks for transaction execution
- User signs in wallet
- Vault balance updates after confirmation
- **This is NOT handled by the AI chat agent** — it's a dedicated web UI form

### US-2.3: Withdraw from Treasury (Web UI)
**As a** user wanting to take funds out of the treasury,
**I want to** withdraw USDC to my wallet using a standard form,
**So that** I receive tokens back in my EOA.

**Acceptance Criteria:**
- Standard web UI form with amount input field
- Calls PlasmaVault.withdraw() or redeem() for unallocated funds
- User signs transaction
- **This is NOT handled by the AI chat agent** — it's a dedicated web UI form

---

## Epic 3: AI Copilot (Alpha Actions via Chat)

### US-3.1: Ask About YO Vaults
**As a** user chatting with the copilot,
**I want to** ask "What are my yield options?" or "Tell me about yoUSD",
**So that** I understand available vaults before allocating.

**Acceptance Criteria:**
- Agent calls `@yo-protocol/core` to fetch vault snapshots (APY, TVL, yield sources)
- Tool renderer shows vault cards with APY, TVL, underlying asset, chain
- Agent explains risk profile in plain language

### US-3.2: Check My Allocation via Chat
**As a** user chatting with the copilot,
**I want to** ask "Where are my funds?" or "Show me my portfolio",
**So that** I see my current allocation (same data as dashboard, but in chat context).

**Acceptance Criteria:**
- Agent reads Fusion vault's ERC4626 market balances (which YO vaults hold how much)
- Agent reads unallocated token balances sitting in the vault
- Tool renderer shows allocation breakdown (same as dashboard but inline in chat)
- Shows USD values using price oracle data

### US-3.3: Allocate to YO Vault
**As a** user with funds in my treasury,
**I want to** say "Put 500 USDC into yoUSD" or "Allocate 50% to yoETH",
**So that** my funds start earning yield.

**Acceptance Criteria:**
- Agent creates FuseAction using Erc4626SupplyFuse.enter({ vault: yoUSD, amount })
- Agent simulates on Tenderly fork showing balance before/after
- Tool renderer shows simulation results
- User signs PlasmaVault.execute([fuseActions])
- YO vault shares appear in treasury balance

### US-3.4: Swap Assets Before Allocation
**As a** user who deposited USDC but wants to allocate to yoETH,
**I want to** say "Swap 500 USDC to WETH and put it in yoETH",
**So that** I can allocate to any YO vault regardless of what I deposited.

**Acceptance Criteria:**
- Agent creates a two-step FuseAction sequence:
  1. UniversalTokenSwapperFuse.enter() — swap USDC → WETH via Odos/KyberSwap/Velora
  2. Erc4626SupplyFuse.enter() — deposit WETH into yoETH
- Both actions batched into single PlasmaVault.execute() call
- Simulation shows token balances before/after (USDC down, yoETH shares up)
- User signs once for the entire batch

### US-3.5: Withdraw from YO Vault
**As a** user wanting to reallocate or cash out from a YO vault,
**I want to** say "Pull my funds from yoUSD" or "Withdraw everything from yoETH",
**So that** I get my assets back in the treasury vault (unallocated).

**Acceptance Criteria:**
- Agent creates FuseAction using Erc4626SupplyFuse.exit({ vault: yoUSD, amount })
- Handles instant vs queued redemption (yoUSD may have async redeem)
- Simulation shows expected asset return
- User signs PlasmaVault.execute()

---

## Epic 4: Multi-Chain Support

### US-4.1: Select Chain on Onboarding
**As a** new user,
**I want to** choose Base, Ethereum, or Arbitrum when creating my vault,
**So that** I can use the chain that suits me.

**Acceptance Criteria:**
- Chain selector in onboarding flow
- Base is default/recommended (best APYs, lowest gas)
- Available YO vaults adjust based on chain selection
- FusionFactory address resolves per chain

### US-4.2: Multi-Chain Vault View (Stretch)
**As a** power user with vaults on multiple chains,
**I want to** see all my positions across chains,
**So that** I have a complete portfolio view.

**Acceptance Criteria:**
- Agent can query positions on multiple chains when asked
- Not the primary flow — single chain per session is fine for MVP

---

## Epic 5: Transparency & Trust

### US-5.1: Simulation Before Every Alpha Action
**As a** user about to sign a transaction from the AI copilot,
**I want to** see a simulation of what will happen to my balances,
**So that** I know exactly what I'm signing.

**Acceptance Criteria:**
- Every allocation/swap action runs through Tenderly fork simulation first
- Shows balance diff (before → after) for all affected tokens
- User can decline to sign after seeing simulation

### US-5.2: Transaction History
**As a** user,
**I want to** ask "Show me my recent transactions",
**So that** I can track what happened.

**Acceptance Criteria:**
- Agent reads PlasmaVault execute events or YO user history
- Shows chronological list with links to block explorer
