# Storybook runs on for chain instead of real chain production chain

- packages/web/src/app/wallet.decorator.tsx
- Storybook should always run Anvil fork based on provided RPC urls from env
- When executes transactions - it doesn't spend real ETH
- Keeping production like behavior - no other mocks needed - only decorator
- Run http://localhost:6007/?path=/story/yo-treasury-create-treasury-vault--default in Playwright MCP to test.
- Executing transactions should not spend real money
- When storybook starts, it transfers USDC to our wallet 0x35b4915b0fCA6097167fAa8340D3af3E51AA3841 from some whale