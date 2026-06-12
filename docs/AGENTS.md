# WalletGenie Mantle Hacks - Agent Guide

## Essential Commands

### Installation
```bash
pnpm install
```

### Database (Supabase)
```bash
# Start local Supabase (required for Ponder)
pnpm db:start
# Stop when done
pnpm db:stop
# Check status
pnpm db:status
```

### Development Servers
```bash
# Web app (Next.js) - http://localhost:3000
pnpm dev:web

# Mastra AI agents - http://localhost:4111
pnpm dev:mastra

# Ponder indexer - http://localhost:42069
pnpm dev:ponder
```

### Type Generation
When modifying `packages/ponder/ponder.schema.ts`:
```bash
# Regenerate Supabase types
pnpm --filter @wgenie/fusion-supabase-ponder gen:types
```

### Smart Contracts (Foundry)
```bash
# Compile contracts
pnpm compile

# Deploy to Mantle Sepolia
pnpm deploy:mantle

# Interact with deployed contract
source packages/hardhat-tests/.env && ~/.foundry/bin/forge call <address> "owner()(address)" --rpc-url $RPC_URL_MANTLE_SEPOLIA
```

### Testing
```bash
# SDK tests
pnpm test:sdk

# Hardhat tests
pnpm test:hardhat
```

## Project Structure
- `packages/web` - Next.js frontend
- `packages/ponder` - Blockchain event indexer
- `packages/mastra` - AI agents (WalletGenie CFO)
- `packages/supabase-ponder` - Supabase client for Ponder data
- `packages/sdk` - Shared ABIs and helpers
- `packages/hardhat-tests/contracts/` - Solidity contracts
- `packages/hardhat-tests/script/` - Foundry deploy scripts
- `foundry.toml` - Foundry config (use `~/.foundry/bin/forge`)

## Key Conventions
1. **Always start database first**: `pnpm db:start` before running Ponder
2. **Ponder auto-migrates**: Schema changes in `ponder.schema.ts` apply automatically on restart
3. **Environment setup**: Copy `.env.example` to `.env.local`/`.env` in each package
4. **Monorepo commands**: Use `pnpm --filter <package> <script>` for package-specific operations

## Important Notes
- Docker required for Supabase CLI
- Node.js >= 22.13.0, pnpm >= 10.28.2
- LLM API keys needed in `packages/mastra/.env`
- Ponder handles DB schema - no manual migrations needed
- This project integrates with Mantle network (Chain ID: 5000 for mainnet, 5003 for Sepolia testnet)
- **Foundry**: Use `~/.foundry/bin/forge` (global `forge` is opencode AI tool, not Foundry)
- **WalletGenieTreasury**: Deployed at `0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4` on Mantle Sepolia (5003)
- When working with Mantle-specific features, refer to mantle-reesources.md for network configuration, DeFi protocols (Merchant Moe, Agni Finance, Fluxion), and RWA assets (USDY, mETH)