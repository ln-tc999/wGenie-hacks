# FSN-0073: Update Fusion Vaults List

## Overview

Scrape all vaults from https://app.wGenie.io/fusion (including "Show all vaults") using Playwright, then sync `plasma-vaults.json` — adding new vaults and removing stale ones. Non-fusion vaults (YO) are left untouched.

## Current State

- `plasma-vaults.json` has 55 vaults (fusion + YO)
- Fusion vaults have `"app": "fusion"`, YO vaults have `"app": "yo"`
- Each vault needs: `name`, `address`, `chainId`, `protocol`, `tags`, `startBlock`, `url`, `app`

## What We're NOT Doing

- Not filling in `startBlock` for new vaults (user will do manually)
- Not extracting category tags from the website — new vaults get `["wgenie-fusion"]`
- Not touching YO vaults (`app: "yo"`)

## Phase 1: Scrape Vault Data from Website

### Steps:

1. Navigate to https://app.wGenie.io/fusion
2. Click "Show all vaults" button to reveal all vaults
3. Extract from each vault card:
   - Vault name
   - Vault address (from the URL/link to individual vault page)
   - Chain (from the URL path: `ethereum`/`base`/`arbitrum`/`avalanche`/`unichain`/`plasma`)
4. Map chain names to chain IDs:
   - `ethereum` → 1
   - `arbitrum` → 42161
   - `base` → 8453
   - `avalanche` → 43114
   - `unichain` → 130
   - `plasma` → 9745

### Success Criteria:

#### Automated Verification:
- [ ] Playwright successfully loads the page and clicks "Show all vaults"
- [ ] Extracted vault list is non-empty and each entry has name, address, chainId

#### Manual Verification:
- [ ] Spot-check a few extracted vaults against the website

## Phase 2: Diff and Update `plasma-vaults.json`

### Steps:

1. Compare scraped vaults against existing fusion vaults in `plasma-vaults.json` (match by `address` lowercase + `chainId`)
2. **Add** new vaults not currently in the file:
   - `startBlock`: `0` (user fills in manually)
   - `tags`: `["wgenie-fusion"]`
   - `protocol`: `"wGenie Fusion"`
   - `app`: `"fusion"`
   - `url`: constructed from chain name + address (e.g., `https://app.wGenie.io/fusion/base/0x...`)
3. **Remove** fusion vaults that are no longer on the website
4. **Keep** all non-fusion vaults (YO) unchanged
5. Preserve existing vault data (startBlock, tags) for vaults that remain

### Success Criteria:

#### Automated Verification:
- [ ] `plasma-vaults.json` is valid JSON
- [ ] Zod validation passes (vault registry parses without errors)
- [ ] No YO vaults were modified or removed

#### Manual Verification:
- [ ] User reviews the diff to confirm additions/removals are correct
- [ ] User fills in `startBlock` for any new vaults

## References

- Ticket: `thoughts/kuba/tickets/fsn_0073-update-fusion-vaults-list.md`
- Vault registry: `packages/web/src/lib/vaults-registry.ts`
- Vault data: `plasma-vaults.json`
