# App config

- I want to have different configs for the app I am currently running
- For example when I run `pnpm dev:web:yo`, then I want to run `yo` setup
- Available setups: yo, fusion
- Setup contains:
  - vault list like `plasma-vaults.json` - separate for each config
  - config should replace current tags - especially current conditional rendering
  - menu items
  - feature flags
  - Identify other posible setup members
- Ponder should listen foevents for all setups together - don't split other apps, only different frontend
- Available vaults should be always limited to the vaults list from config