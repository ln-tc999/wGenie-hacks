# Consolidate Alpha tools for YO treasury

- Path: packages/web/src/alpha/tools/tool-renderer.tsx
- For YO treasury alpha agetn chat I want to refine used tools
- I don't like how YO treasury agent displays tools now
- But I like how it's done for Fusion Alpha agent
- Use the same tools, or at leas same styled components for YO Treasury agent tools outputs like for Fusion Alpha agent
- Test in browser using playwright and storybook
- Create Storybook story for YO treasury chat UI and interact with it in browser
- Use `packages/web/src/app/wallet.decorator.tsx` - then you can trigger real transactions
- Adjust both web app code (nextjs) and Mastra agents code

## Actions with simulation

- I want to use `packages/web/src/alpha/tools/action-with-simulation/action-with-simulation.tsx` for YO treasury vault.
- Use yo vaults as market destinations
- Present before/after simulation balances

## Pending actions

- I want to use `packages/web/src/alpha/tools/pending-actions/pending-actions-list.tsx` for YO treasury vault.
- Use it to show what transactions are currently in mastra conversation memory
- For yo possible actions are deposit, withdrawals, swaps