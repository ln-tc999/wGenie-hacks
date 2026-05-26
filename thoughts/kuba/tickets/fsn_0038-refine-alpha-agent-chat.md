# Refine Alpha agent chat

- COntinue work from prev task
- Read the plan of that prev task
- Focus on testing in Storybook via Playwrignt mcp
- Test different transaction composition
  - example: withdraw from aave and put that amount to morpho
  - example: withdraw from any market and split to two other markets
  - example: deposit and withdraw same amount in one batch to test agains 0 changes in the before after
  - try different combinations, be creative
- Execute transactions each time, don't only simulate or only check balances
- Display correct morpho and euler market/vault label - lookup in fusion-webapp external repo
- Dont show $0.00 -> $0.00 if no changes, focus on what's really changed or moved - adjust UI components
- make story dark theme by default
- Put protocol icons in rounded squares to adjust contrast - morpho logo is white
- Test in browser using Playwright MCP, test stories http://localhost:6007/iframe.html?globals=&id=vault-details-vaultalpha--base-usdc-vault&viewMode=story - don't test in webapp
- Vault for testing 0xa13f7342a1db4c32f8dc0539e3b6d1cf101e7d04 on base 
- Account for testing 0x35b4915b0fCA6097167fAa8340D3af3E51AA3841 - this is alpha, you can execute transactions
- Look for the code in /Users/kuba/wgenie-labs/wgenie-webapp/src - wizard
- IMPORTANT: identify any other UX issues:
  - in chat use human readable numbers like 1.342 with decimal point based of assets decimals instead of showing bare integer
  - when showing addresses use existing component to link to ether scan, copy address, show debank icon with link if a vault
  - When showing tx hash - link to block explorer transaction page
- IMPORTANT: fix any issue you identify, if you can't, then write them into next ticket





