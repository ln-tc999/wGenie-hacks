# Global Inflow Chart For all vaults

- Create top level home page - Dashboard 
  - that page is supposed to show overall statistics, present protocol overview
- First item on this page is global flows chart
- Read this chart to show inflow/outflow/net flow for all vaults for all chains on one chart
  - `packages/web/src/flow-chart/flow-chart.tsx`
- Avoid code duplication
- Extract UI component
- Show in USD - read `packages/sdk/src/PlasmaVault.ts` getAssetUsdPrice_18 method - read prices for all vaults in multicall