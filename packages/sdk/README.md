# wGenie Fusion SDK

TypeScript SDK for interacting with wGenie Fusion protocol smart contracts.

## Installation

```bash
yarn add @wgenie/fusion-sdk
```

Or using npm:

```bash
npm install @wgenie/fusion-sdk
```

## Usage

```typescript
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Create clients
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http()
});

// Initialize PlasmaVault
const plasmaVault = await PlasmaVault.create(
  publicClient,
  '0x...' // PlasmaVault contract address
);

// Get vault information
const totalAssets = await plasmaVault.getTotalAssets();
const tvl = await plasmaVault.getTvl();
const fuses = await plasmaVault.getFuses();

// Execute fuse actions (requires wallet client)
const fuseActions = [
  // Your fuse actions here
];

await plasmaVault.execute(walletClient, [fuseActions]);
```

## Features

- **PlasmaVault Management**: Create, configure, and manage Plasma Vaults
- **Fuse Operations**: Add, remove, and execute fuse actions
- **Market Management**: Handle market substrates and permissions
- **Fee Management**: Configure and update performance and management fees
- **Access Control**: Manage roles and permissions
- **Price Oracle Integration**: Get asset prices and TVL calculations
- **PreHook Management**: Configure pre-execution hooks

## API Reference

### PlasmaVault

The main class for interacting with Plasma Vault contracts.

#### Static Methods

- `PlasmaVault.create(publicClient, address)` - Create a new PlasmaVault instance

#### Instance Methods

- `execute(walletClient, fuseActions)` - Execute fuse actions
- `getTotalAssets()` - Get total assets in the vault
- `getTvl()` - Get total value locked in USD
- `getFuses()` - Get list of supported fuses
- `addFuses(walletClient, fuseAddresses)` - Add new fuses
- `removeFuses(walletClient, fuseAddresses)` - Remove fuses
- `getMarketSubstrates(marketId)` - Get substrates for a market
- `grantMarketSubstrates(walletClient, marketId, substrates)` - Grant market substrates
- `hasRole(roleKey, accountAddress)` - Check if account has a role
- `grantRole(walletClient, roleValue, account, timelockSeconds)` - Grant a role to an account

## Development

### Setup

```bash
yarn install
```

### Build

```bash
yarn build
```

### Development Mode

```bash
yarn dev
```

### Testing

```bash
# Run tests once
yarn test

# Run tests in watch mode
yarn test:watch
```

## Dependencies

### Runtime Dependencies

- [viem](https://viem.sh/) - TypeScript interface for Ethereum
- [zod](https://zod.dev/) - Schema validation
- [remeda](https://remedajs.com/) - Functional utilities

### Development Dependencies

- [TypeScript](https://www.typescriptlang.org/) - Type safety and compilation
- [Vitest](https://vitest.dev/) - Fast unit testing framework

## License

MIT
