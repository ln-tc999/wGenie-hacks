---
name: generate-fuse-abis
description: Generate TypeScript ABI files from wgenie-fusion Foundry smart contracts. Use when the user asks to generate ABIs, update fuse ABIs, extract ABIs from Solidity contracts, or sync ponder ABIs with wgenie-fusion.
allowed-tools: Bash, Read, Write
---

# Generate Fuse ABIs

Generate TypeScript ABI files for all fuse smart contracts from the wgenie-fusion Foundry submodule.

## Prerequisites

- Foundry must be installed (`forge` command available)
- Node.js must be installed

## Steps

### 1. Build the Foundry project

Ensure output files are up to date:

```bash
cd external/wgenie-fusion && forge build
```

### 2. Generate individual fuse ABI files

Run the generation script:

```bash
node packages/ponder/abis/generate-fuse-abis.mjs
```

This creates TypeScript ABI files in `packages/ponder/abis/fuses/` for each fuse contract found in `external/wgenie-fusion/contracts/fuses/`.

### 3. Generate merged events ABI

Run the events merger script:

```bash
node packages/ponder/abis/generate-merged-events.mjs
```

This creates `packages/ponder/abis/all-fuses-events.ts` containing all unique events from the fuse contracts.

## Output

- **Individual ABIs**: `packages/ponder/abis/fuses/*.abi.ts`
- **Merged Events**: `packages/ponder/abis/all-fuses-events.ts`

## File Format

Generated files follow this pattern:

```typescript
import { Abi } from 'viem';

export const contractNameAbi = [
  // ABI entries
] as const satisfies Abi;
```
