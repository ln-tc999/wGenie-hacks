# Add memory to Alpha agent to remember what transactions to execute in batch

Test that SDK features in packages/hardhat-tests/test/markets and packages/hardhat-tests/test/plasma-vault/alpha-execute.ts

## Instructions 

- Use SDK for Aaave, Morpho and Euler from packages/sdk/src/markets to create actions
- Keep these actions in Alpha Agent memory
- Display actions list from memory in alpha agent custom component
- Don't implement executing transactions - only list
- Test in browser using Playwright MCP
  - Visit http://localhost:3000/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai
  - Visit http://localhost:4111/agents/alpha-agent/chat/4566ec59-964f-4750-81ea-301a4c90903d
- Wait for fsn_0033-testing-alpha-agent-in-studio to be done first