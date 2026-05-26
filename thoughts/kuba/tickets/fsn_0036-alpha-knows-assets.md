# Alpha agent can read erc20 tokens that the vault holds

I want alpha agent from Mastra to know what erc20 tokens the vault holds.

## Instructions

- Before adding new actions Alpha needs to know what erc20 tokens are unalocated
- Read substrates for erc20 market
- Substrates of erc20 market are erc20 token addresses
- That are addresses that the vaults supports
- Alpha should read 
  - name
  - symbol
  - balanceOf(vault)
  - dollar price for that asset
  - calc dollar value of hold assets
- Then user can talk to agent using token name or symbol
- Then Alpha know how much can be moved
- run `pnpm dev:web` and `pnpm dev:mastra` in background to have access to logs
- Test agent by typing messages to the agent
- Test in browser with Playwright MCP
  - Visit http://localhost:4111/agents/alpha-agent to test alpha agent in Mastra studio studio
  - Visit http://localhost:3000/vaults/8453/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04/ask-ai to test alpha agent in web app
  - Visit http://localhost:8088/fusion/base/0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04 to test against balances - this page show all vault balances
- Vault for tests 0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04 - add it to json list start block 41688947