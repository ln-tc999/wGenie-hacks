# Adjust vault page to support deferent kind of vaults

- Yo Treasury vualt: http://localhost:3000/vaults/8453/0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D
  - address on base chain: 0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D
- Add proper tags to each vault in plasma-vaults.json
  - all vaults except YO treasury should add `wgenie-fusion` tag
  - Yo treasury gets `yo-treasury`
- Add yo vaults to plasma-vaults.json and give them `yo-vault`
- Base on that tags display features in vault page:
  - Alpha tab available only for `wgenie-fusion` tag
  - YO Treasury tab available only for `yo-treasury`
  - So far no extra features for `yo-vault`
  - For `yo-treasury` show `packages/web/src/yo-treasury/components/treasury-dashboard.tsx` on the top of overview tab
- Deposit and withdraw features should be available for all vaults
  - split page into two sides like Euler and Morpho does
    - https://app.euler.finance/vault/0x69ebF644533655B5D3b6455e8E47ddE21b5993f1?network=ethereum
    - https://app.morpho.org/base/vault/0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2/steakhouse-prime-usdc#overview
    - Explore these sites using playwright-cli skill
  - right column is for Deposit and Withdraw features stiky to the top when scrolling
  - left side is current main content with tabs
  - switching tabls does not affect Deposit and Withdraw

# Instructions

- Read all files in `packages/web/src/app/vaults/[chainId]/[address]`
- Review current progress
- Read all plan files in `thoughts/kuba/notes/yo-hackathon/project-plan`
- Read on POC tests: packages/hardhat-tests/test/yo-treasury/create-vault.ts
- Spawn an agent team to explore from different angles
- Use playwright-cli skill to test in browser