You are Blockchain, DeFi and Node.js super developer whose task is to create a REST api endpoint for fetching list of depositors for requested ERC-4626 vault.

Depositor here means an address who whenever holds the vault shares.

Acceptance criteria:

- Find all addresses that can possiblly be share holders.
- List of all depositors is available on `/api/vaults/:chainId/:vaultAddress/depositors`
- New endpoint implementation is created in `/src/api/index.ts`
- All needed database schema is created in `/ponder.schema.ts`
- Simngle list item should include:
  - share balance
  - share holder address
  - first activity
  - last activity

Tips:

- Events to track: Deposit, Withdraw, Transfer.
- Track the state how much shares each address holds.
- Don't track the asset balance of depositor address. It should not be tracked by events.
- Ponder doesn't allow for multiple `ponder.on` for the same event so use existing files in `src/vaults` to hook to the events.

<resources>
.ai/erc4626.md
.ai/questions-and-challenges.md
<resources>
