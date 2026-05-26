# Fix Issues And Refactor Vaults List page

- Ensure TVL, Net Flow and any other dollar values are calculated correctly
  - Read `packages/sdk/src/PlasmaVault.ts` and getTvl method
  - Ensure that the unit that numbers are presented is always correct
- All data fetched on server side and cashed for 1 minute
- Read `packages/sdk/src/PlasmaVault.ts` to know how to read data of plasma vault

## Columns

- remove asset columns and move asset to vault name column
- In `Vault Name` column
  - Rename `Vault Name` column to `Vault`
  - As on the Activity page, show token and chain icon - extract and reuse component
  - vault name should link to vault page
- In TVL column
  - ensure that values are correct and are presented in dollar
- Show separate column with TVL in vault asset units like USDC, WBTC, stETH
- Show filters: netFlow (7d), Underlying Asset, Chains, Protocols visible above the table, not in the dropdown
  - TVL Range and Depositors count leave in current dropdown
  - Change that dropdown label from `Filters` to `More filters`





