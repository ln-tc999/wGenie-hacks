# FSN-0055: Vault Creation Page — UX Refinement via Storybook

## Context

The vault creation page at `/yo-treasury/create` is functional but has minimal UX. It calls `createAndConfigureVault()` which is good for node script but wrong for frontend. It runs ~16 sequential transactions. The user currently sees a static "Creating vault..." message with no per-step feedback, no error recovery, and no post-creation guidance.

A Storybook story exists at `YO Treasury / Create Treasury Vault > Default` using `WalletDecorator` for real wallet auto-connect. Use this story as the development environment — iterate on UX in Storybook, test with Playwright MCP.

## Current State

- Page: `packages/web/src/app/yo-treasury/create/page.tsx`
- Story: `packages/web/src/app/yo-treasury/create/create-treasury-vault.stories.tsx`
- SDK function: `createAndConfigureVault()` in `packages/sdk/src/markets/yo/create-vault.ts` - use only for reference
- Storybook: runs on `localhost:6007`, start with `cd packages/web && pnpm storybook`

## Other Instructions

- Review current progress
- Read all plan files in `thoughts/kuba/notes/yo-hackathon/project-plan`
- Read POC tests: packages/hardhat-tests/test/yo-treasury/create-vault.ts
- Spawn an agent team to explore from different angles
- Use wagmi hooks like
  - `useWriteContract` for executing transaction
  - `useReadContract` for reading state
- Don't store full progress in localstorage - only the vault address
- Read actual state from the chain direcly
- don't use `createAndConfigureVault` as it is. Reproduce it to be frontend specific implementation
- Read `/Users/kuba/wgenie-labs/wgenie-webapp/src/transactions/useContractWriteTransaction.ts` to learn what to detect transaction state

## UX flow

- User executes each action separetally - not one button to trigger everytging - one tx to sign, one tx component with trigger button and feedback
- Test in browser using Playwright MCP: http://localhost:6007/iframe.html?globals=&id=yo-treasury-create-treasury-vault--default
- You have access to real wallet via WalletDecorator - spend ETH for gas sparingly
- Use wagmi for frontend interactions with smart contracts
- Look for bes in class patterns for executing transactions on frontend in `/Users/kuba/wgenie-labs/wgenie-webapp/src/transactions/useContractWriteTransaction.ts`
- Each transaction should be separate feature/component that accepts chainId and vault address
If a step fails (user rejects tx, gas estimation fails, etc.):
  - Show which step failed and the error
  - Allow retry from the failed step (don't restart from clone)
  - The vault address is known after step 1 (clone) — store it so configuration can resume
- After vault is created:
  - Show vault address prominently with copy button
  - Link to the vault page at `/vaults/8453/{address}`
- Better layout/spacing
- Loading spinner or animation during tx signing
- Success state with clear visual feedback

