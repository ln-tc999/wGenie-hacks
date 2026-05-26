# Generate Fuse ABIs

Generate TypeScript ABI files for all fuse smart contracts from the wgenie-fusion submodule.

## Instructions

1. First, build the Foundry project to ensure output files are up to date:
   ```bash
   cd external/wgenie-fusion && forge build
   ```

2. Run the script to generate individual fuse ABI files:
   ```bash
   node packages/ponder/abis/generate-fuse-abis.mjs
   ```

3. Run the script to generate the merged events ABI:
   ```bash
   node packages/ponder/abis/generate-merged-events.mjs
   ```

## Output

- Individual fuse ABIs are saved to `packages/ponder/abis/fuses/`
- Merged events ABI is saved to `packages/ponder/abis/all-fuses-events.ts`
