# FSN-0070: Migrate YO Vault Deposit/Withdraw to @yo-protocol/react Hooks

## Problem

Individual YO vault detail pages (yoUSD, yoETH, yoBTC, yoEUR) use the generic `VaultActionTabs` sidebar with wagmi `useWriteContract` directly against the vault ERC4626 interface. This bypasses the YO Protocol gateway, which handles approval batching, slippage protection, and cross-chain routing.

## Task

Replace the deposit/withdraw sidebar on `yo-vault` tagged pages with `@yo-protocol/react` hooks:
- `useDeposit` for deposits (handles approve + deposit in one flow, chain switching)
- `useRedeem` for withdrawals (handles instant vs queued redemptions)

## Requirements

1. Set up `YieldProvider` in the component tree (or use `useCreateYoClient` standalone)
2. Create `YoDepositForm` using `useDeposit({ vault: vaultAddress })`
3. Create `YoWithdrawForm` using `useRedeem({ vault: vaultAddress })`
4. Wire into `vault-detail-layout.tsx` — render YO forms instead of generic `VaultActionTabs` when vault has `yo-vault` tag
5. Show step progress (approving → depositing → waiting → success)

## References

- Skill: `.claude/skills/yo-protocol-react`
- Current sidebar: `packages/web/src/vault-actions/components/vault-action-tabs.tsx`
- Hook API: `.claude/skills/yo-protocol-react/references/hooks-api.md`
- Existing YO deposit form (wagmi-based): `packages/web/src/yo-treasury/components/deposit-form.tsx`
