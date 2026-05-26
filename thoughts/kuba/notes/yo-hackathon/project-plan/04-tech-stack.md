# YO Treasury — Tooling, Dev Tools & Tech Stack

## Core Dependencies

### Smart Contract Interaction
| Package | Version | Purpose |
|---------|---------|---------|
| `viem` | latest | Ethereum client library (encoding, multicall, contract reads/writes) |
| `wagmi` | latest | React hooks for wallet connection, chain switching, contract interaction |
| `@yo-protocol/core` | 1.0.7 | YO Protocol SDK — vault reads, `getVaults()` → APR/TVL/share price, `getPrices()` → token prices |
| `@wgenie/fusion-sdk` | workspace | wGenie Fusion SDK — PlasmaVault, market IDs, protocol adapters, FuseAction types, access manager roles |

### AI Agent
| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | workspace | Agent framework, tool system, memory |
| `@ai-sdk/react` | latest | `useChat` hook for streaming chat UI |
| `ai` | latest | AI SDK stream utilities (`toAISdkStream`, `createUIMessageStreamResponse`) |
| Claude Haiku 4.5 (via OpenRouter) | - | LLM model for agent reasoning |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16 | React framework with App Router |
| `react` | 19 | UI library |
| `tailwindcss` | 4 | Styling |
| `shadcn/ui` | latest | UI component primitives |
| `zod` | latest | Runtime type validation |
| `recharts` | latest | Charts for allocation visualization (if needed) |

### Dev Tools & Testing
| Tool | Purpose |
|------|---------|
| `pnpm` | Package manager (workspace monorepo) |
| `tsx` | TypeScript script runner (for deployment scripts) |
| `hardhat` | Fork testing — pin to a block, deterministic tests (see `packages/hardhat-tests/`) |
| Tenderly Virtual TestNet | Serverless fork simulation for agent action testing (replaced local Anvil forks — FSN-0087) |
| `@yo-protocol/cli` | CLI tool for ad-hoc vault queries during development |
| Playwright MCP | Browser automation for web UI testing |
| Mastra Studio | Agent testing and debugging UI |

## External APIs

### Odos (Swap Aggregator — Primary)
- **Quote API**: `POST https://api.odos.xyz/sor/quote/v2`
- **Assemble API**: `POST https://api.odos.xyz/sor/assemble`
- Free, no API key required
- Returns swap calldata for UniversalTokenSwapperFuse
- Base router: `0x19cEeAd7105607Cd444F5ad10dd51356436095a1`

### KyberSwap (Swap Aggregator — Backup)
- **Quote API**: `GET https://aggregator-api.kyberswap.com/base/api/v1/routes`
- **Build API**: `POST https://aggregator-api.kyberswap.com/base/api/v1/route/build`
- Free, no API key required
- Base router: `0x6131B5fae19EA4f9D964eAc0408E4408b66337b5`

### Velora / Paraswap (Swap Aggregator — Backup)
- Router address TBD — research during implementation
- Adds a third aggregator option for better swap coverage

### YO Protocol REST API
- **Base URL**: `https://api.yo.xyz`
- Vault snapshots, yield history, TVL history, user history
- No auth required
- Already wrapped by `@yo-protocol/core` SDK methods

## Environment Variables

```env
# RPC URLs (required)
BASE_RPC_URL=https://...          # Base chain RPC
ETHEREUM_RPC_URL=https://...      # Ethereum mainnet RPC (optional for multi-chain)
ARBITRUM_RPC_URL=https://...      # Arbitrum RPC (optional for multi-chain)

# Mastra Agent
MODEL=openrouter/anthropic/claude-haiku-4-5-20251001  # or claude-sonnet

# Existing (for Hardhat tests)
RPC_URL_BASE=...                  # Used by hardhat.config.ts for fork testing
RPC_URL_MAINNET=...               # Used by hardhat.config.ts for fork testing
```

## Project Structure

**No new packages.** We extend `packages/web` (frontend + constants), `packages/mastra` (agent + tools), and `packages/hardhat-tests` (fork tests). This gives us all existing infrastructure for free: wagmi, shadcn, sidebar, auth, App Router, chat patterns, transaction execution components.

```
packages/
├── hardhat-tests/                  # EXISTING — Add fork tests
│   └── test/
│       └── yo-treasury/            # NEW test directory
│           ├── create-vault.ts     # Fork test: vault creation + setup
│           ├── deposit.ts          # Fork test: USDC deposit with WHITELIST_ROLE
│           ├── allocate.ts         # Fork test: ERC4626SupplyFuse.enter
│           ├── swap.ts             # Fork test: UniversalTokenSwapperFuse.enter
│           └── withdraw.ts         # Fork test: ERC4626SupplyFuse.exit
│
├── mastra/                         # EXISTING — Add agent + tools
│   └── src/
│       ├── agents/
│       │   └── yo-treasury-agent.ts     # NEW agent definition
│       ├── tools/
│       │   └── yo-treasury/             # NEW tool directory
│       │       ├── index.ts
│       │       ├── types.ts             # Tool output type union
│       │       ├── get-yo-vaults.ts
│       │       ├── get-yo-vault-details.ts
│       │       ├── get-treasury-allocation.ts
│       │       ├── create-allocation-action.ts
│       │       ├── create-withdraw-action.ts
│       │       └── create-swap-action.ts
│       └── mastra/
│           └── index.ts             # Register new agent
│
├── web/                            # EXISTING — Extended with yo-treasury feature
│   └── src/
│       ├── app/
│       │   ├── yo-treasury/
│       │   │   └── create/page.tsx  # Vault creation page
│       │   ├── vaults/[chainId]/[address]/yo/
│       │   │   └── page.tsx         # YO Treasury tab on vault detail
│       │   └── api/yo/treasury/
│       │       └── chat/route.ts    # Chat API route
│       ├── styles/
│       │   └── global.css           # YO theme tokens (--color-yo-*, --font-yo)
│       └── yo-treasury/             # Feature directory
│           ├── hooks/
│           │   ├── use-vault-reads.ts         # Shared on-chain reads + oracle pricing
│           │   ├── use-treasury-positions.ts  # Wagmi multicall for YO vault positions
│           │   └── use-yo-vaults-data.ts      # @yo-protocol/core getVaults() + getPrices()
│           └── components/
│               ├── treasury-dashboard.tsx   # Primary view — PortfolioSummary + AllocationTable
│               ├── portfolio-summary.tsx    # 4 stat cards (Total, Allocated, Unallocated, Active)
│               ├── allocation-table.tsx     # Merged on-chain + API vault data table
│               ├── deposit-form.tsx         # ERC20 approve + ERC4626 deposit
│               ├── withdraw-form.tsx        # ERC4626 redeem with isMax flag
│               ├── create-vault-flow.tsx    # 6-step vault creation (FSN-0055)
│               ├── yo-treasury-tab.tsx      # Entry point — dashboard-first layout
│               ├── yo-treasury-tab.stories.tsx # Storybook story
│               ├── treasury-chat.tsx        # Chat UI (alpha actions)
│               ├── yo-tool-renderer.tsx     # Tool output switch
│               └── yo-vaults-list.tsx       # YO vault cards (chat renderer)
│
├── sdk/                            # EXISTING — @wgenie/fusion-sdk
│   └── src/                        # Reuse: PlasmaVault, MARKET_ID, FuseAction,
│                                   # substrateToAddress, ACCESS_MANAGER_ROLE,
│                                   # plasmaVaultAbi, accessManagerAbi
```

### What We Get For Free (from existing `packages/web`)

| Feature | Source |
|---------|--------|
| Wagmi multi-chain setup | `app/wagmi-provider.tsx`, `app/chains.config.ts` |
| SIWE auth | `auth/`, `app/api/auth/` |
| Sidebar navigation | `components/sidebar/` — just add a nav entry |
| shadcn UI components | `components/ui/` (button, card, input, dialog, table, etc.) |
| App Router patterns | `app/` layout + page conventions |
| Chat UI pattern | `vault-details/components/vault-alpha.tsx` — copy and adapt |
| ExecuteActions 5-step flow | `vault-details/components/execute-actions.tsx` — reuse as-is |
| Simulation components | `vault-details/components/simulation-balance-comparison.tsx` — reuse |
| PendingActionsList | `vault-details/components/pending-actions-list.tsx` — reuse |
| Token/chain/protocol icons | `components/token-icon/`, `components/chain-icon/` |
| Account management | `account/` — ENS, Safe wallet detection |
| React Query setup | `app/query-client-provider.tsx` |
| Private key connector (dev) | `app/private-key-connector.ts` — for testing |

## Key ABIs Needed

| ABI | Source | Functions Used |
|-----|--------|---------------|
| `fusionFactoryAbi` | wgenie-webapp `fusion/factory/abi/` or extract | `clone` |
| `plasmaVaultFactoryAbi` | wgenie-webapp `fusion/factory/abi/` or extract | `PlasmaVaultCreated` event |
| `accessManagerAbi` | `@wgenie/fusion-sdk` (already exported) | `grantRole`, `hasRole` |
| `plasmaVaultAbi` | `@wgenie/fusion-sdk` (already exported) | `addFuses`, `addBalanceFuse`, `grantMarketSubstrates`, `updateDependencyBalanceGraphs`, `execute`, `deposit`, `withdraw`, `redeem` |
| `erc4626SupplyFuseAbi` | Extract from Solidity or use `generate-fuse-abis` skill | `enter`, `exit` |
| `universalTokenSwapperFuseAbi` | Extract from Solidity or use `generate-fuse-abis` skill | `enter` |
| `erc20Abi` | viem | `approve`, `balanceOf`, `allowance` |

## Testing Strategy

### Fork Tests (Hardhat)
- Use `packages/hardhat-tests/` patterns
- Pin to specific Base block for determinism
- Test full vault lifecycle: create → configure → deposit → allocate → swap → withdraw
- Private keys from Hardhat test accounts only — NEVER in production code
- Can also use private key connector in Playwright (isolated from production)

### Agent Tests (Mastra)
- Test in Mastra Studio (development)
- Create automated test scripts for tool validation
- Create test slash commands (prompts) for non-deterministic agent behavior testing
- Test in terminal for quick iteration

### Web UI Tests (Playwright MCP)
- Test onboarding flow end-to-end
- Test deposit/withdraw forms
- Test dashboard rendering with real data
- Test chat integration

### Regression Protection
- Maintain test suites for all phases
- Run fork tests before marking any task complete
- Good coverage across on-chain logic, agent tools, and UI

## Development Workflow

1. **Start Mastra dev server**: `cd packages/mastra && pnpm dev` — for agent testing in Mastra Studio
2. **Start Next.js dev**: `cd packages/web && pnpm dev` — for frontend development
3. **Test agent tools**: Chat in Mastra Studio at `http://localhost:4111`
4. **Run fork tests**: `cd packages/hardhat-tests && pnpm test -- --grep yo-treasury`
5. **Test full flow**: Open `http://localhost:3000/yo-treasury`, connect wallet
6. **Ad-hoc YO queries**: `npx yo info vaults --chain 8453` or `npx yo api vault-snapshot --vault yoUSD --chain 8453`

## Screenshots

All screenshots created during development go to: `thoughts/kuba/notes/yo-hackathon/screenshots/`
Do NOT create screenshots at repository root level.

## Skills to Use During Implementation

| Skill | When to Use |
|-------|-------------|
| `fuse-explorer` | Finding fuse code, understanding fuse interfaces |
| `mastra` | Mastra framework patterns, agent/tool creation |
| `vercel-react-best-practices` | React/Next.js performance optimization |
| `web-design-guidelines` | UI review and accessibility |
| `web3-data-fetching` | Complex blockchain data fetching workflows |
| `yo-protocol-cli` | Ad-hoc vault queries during development |
| `yo-protocol-sdk` | YO SDK integration patterns |
| `yo-design` | YO brand aesthetic (dark theme, neon green, Space Grotesk) |
| `yo-protocol-react` | React hooks reference (used for pattern guidance) |
| `test-driven-development` | TDD approach where possible |
| `generate-fuse-abis` | Extracting ABIs from Solidity contracts |
