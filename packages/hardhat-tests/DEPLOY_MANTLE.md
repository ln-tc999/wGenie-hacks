# Deploy Fusion Contracts to Mantle

## Prerequisites

```bash
# 1. Install dependencies
pnpm install

# 2. Init submodules (contract source)
git submodule update --init --recursive
cd external/wgenie-fusion && forge build && cd ../..

# 3. Copy env & set RPC + private key
cp .env.example .env
# Edit .env:
#   RPC_URL_MANTLE_SEPOLIA=https://rpc.sepolia.mantle.xyz
#   DEPLOYER_PRIVATE_KEY=your-key-without-0x
```

## Deploy

```bash
pnpm --filter @wgenie/fusion-hardhat-tests exec npx hardhat run scripts/deploy-mantle.ts --network mantleSepolia
```

Script akan deploy dalam urutan:

1. **FusionFactory** — Factory untuk clone vaults
2. **ERC4626SupplyFuse** (Slot 1-4) — Supply fuses untuk tiap asset
3. **ERC4626BalanceFuse** (Slot 1-4) — Balance fuses
4. **UniversalTokenSwapperFuse** — Swap fuse
5. **ZeroBalanceFuse** — Zero-balance checker buat swap market

Address hasil deploy otomatis tersimpan di `deployed-mantle.json`. Script bisa dihentikan dan dilanjutkan — contract yg udah terdeploy di-skip (cached by name).

## Update SDK Addresses

Setelah deploy, update address constants di:

- `packages/sdk/src/fusion.addresses.ts` — tambah entries buat `mantle.id` (5000)
- `plasma-vaults.json` — tambah vault entries dengan chainId 5000

## Deploy Production (Mantle Mainnet)

Ganti env:

```env
RPC_URL_MANTLE_MAINNET=https://rpc.mantle.xyz
```

Edit `scripts/deploy-mantle.ts`:

```ts
import { mantle } from 'viem/chains';  // instead of mantleSepoliaTestnet
const CHAIN = mantle;
```

Run:

```bash
RPC_URL_MANTLE_MAINNET=... DEPLOYER_PRIVATE_KEY=... pnpm --filter @wgenie/fusion-hardhat-tests exec npx hardhat run scripts/deploy-mantle.ts
```

## Verify Contracts

```bash
npx hardhat verify --network mantleSepolia <CONTRACT_ADDRESS> [constructor_args]
```
