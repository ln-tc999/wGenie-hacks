# Sdk for Aaave, Morpho and Euler alpha markets

You are tasked to create SDK for Aaave, Morpho and Euler in packages/sdk/src/markets.
Test that SDK features in packages/hardhat-tests/test/markets and packages/hardhat-tests/test/plasma-vault/alpha-execute.ts

## Instructions 

- Read:
  - external/wgenie-fusion/contracts/vaults/PlasmaVault.sol
  - external/wgenie-fusion/out/PlasmaVault.sol/PlasmaVault.json
- In external/wgenie-fusion/test
  - search for `execute(`
- I want only to support Aaave, Morpho and Euler
- Read in extarnal frontend repo: 
  - /Users/kuba/wgenie-labs/wgenie-webapp/src/fusion/markets/aaveV3/AaveV3.ts
- In sdk packages/sdk/src/PlasmaVault.ts
  - learn about execute function how it's used in /Users/kuba/wgenie-labs/wgenie-webapp/src/fusion
- Add new classes for markets in packages/sdk/src/markets
  - Aaave, Morpho and Euler like in /Users/kuba/wgenie-labs/wgenie-webapp/src/fusion/markets/aaveV3/AaveV3.ts
  - add that code to sdk here
- Read example tests writen in different test framework 
  - `src/fusion/markets/aaveV3/__tests__`
  - `src/fusion/markets/compoundV3/__tests__` - only as example, don't implement Compound
  - `src/fusion/markets/gearboxV3/__tests__` - only as example, don't implement Gearbox
- Test execute in packages/hardhat-tests/test/plasma-vault/alpha-execute.ts
- Test markets in:
  - packages/hardhat-tests/test/markets/aave-v3.ts
  - packages/hardhat-tests/test/markets/euler-v2
  - packages/hardhat-tests/test/markets/morpho