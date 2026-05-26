# FSN-0059: YO Treasury Withdraw Form

## Task
Replace the `WithdrawPlaceholder` with a working `WithdrawForm` component that withdraws USDC from the PlasmaVault (ERC4626 `withdraw`/`redeem`).

## Context
- Deposit form is done and tested E2E (`deposit-form.tsx`) — use it as the pattern
- `WithdrawPlaceholder` at `packages/web/src/yo-treasury/components/withdraw-placeholder.tsx` — replace with real form
- Already integrated in `yo-treasury-tab.tsx` two-column layout (right column, below DepositForm)
- Demo vault: `0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D` on Base (8453), has 1 USDC deposited
- Vault is ERC4626 — use `erc4626Abi` from viem (`withdraw` or `redeem`)
- User's position: read via `erc20Abi.balanceOf(vaultAddress)` for shares, `erc4626Abi.convertToAssets(shares)` for underlying value
- No approval needed for withdraw (user withdraws their own shares)

## Scope
- New `WithdrawForm` component at `packages/web/src/yo-treasury/components/withdraw-form.tsx`
- Props: `{ chainId: number; vaultAddress: Address }`
- Show current position in USDC + USD (not raw shares)
- Amount input with Max button
- Single-step tx: `erc4626Abi.redeem(shares, receiver, owner)` or `withdraw(assets, receiver, owner)`
- Prefer `redeem` (share-denominated) — avoids rounding issues
- Success/error states, refetch balances after withdraw
- Update `yo-treasury-tab.tsx` to render `WithdrawForm` instead of `WithdrawPlaceholder`
- Add Storybook story (same pattern as `deposit-form.stories.tsx` with `WalletDecorator` + chain switch)
- Test E2E in Storybook: withdraw the 1 USDC from demo vault

## NOT in scope
- Withdrawing allocated funds from YO vaults (that's the agent's job via YoRedeemFuse)
- This only withdraws unallocated USDC sitting in the PlasmaVault

## References
- Deposit form (pattern to follow): `packages/web/src/yo-treasury/components/deposit-form.tsx`
- Deposit story: `packages/web/src/yo-treasury/components/deposit-form.stories.tsx`
- Implementation plan: `thoughts/shared/plans/2026-03-07-FSN-0058-yo-treasury-deposit.md`
- Progress tracker: `thoughts/kuba/notes/yo-hackathon/project-plan/05-progress-tracker.md`
