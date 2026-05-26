# Fix issues and refactor Activity list page

## Activiti data table

- Local url for testing: http://localhost:3000/activity
- Use PlayWright MCP for testing results in browser
- In Activity column change
  - remove badge -> says withdraw
  - add badge -> says deposit
  - move chain icon to next column: vault 
- In Vault column
  - display chain icon next to the title
  - display vault asset icon next to the title
- in amount column
  - ensure that dollar value is calculated correctly: total assets (not shares) * asset price
- in depositor column
  - Display address like in `packages/web/src/account/account.tsx` - share this component
  - show ens name if available
  - show ens icon or wallet icon like Safe
- In tx has column
  - link anchor like `view tx`
  - change column head title from `tx hash` to something more user fiendly like `transaction`

## List filters

- activiti type filter
  - change labels: deposits, withdrawals
- vault filter
  - display vault the same way like in vault column
  - show chain icon and asset icon
- values filet
  - use toogle group instead of select: https://ui.shadcn.com/docs/components/radix/toggle-group

## Total Inflows quick metricts

- use red color fo negative values 
- ensure that dollar amounts are calculated correctly: total assets (not shares) * asset price

## Tips

- Read for reference
  - packages/web/src/depositors-list-item/depositors-list-item.tsx

## Token icon

- find token icon component in $ARGUMENTS