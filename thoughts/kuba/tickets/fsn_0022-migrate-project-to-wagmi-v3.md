# Migrate wagmi to v3

Migrate wagmi and viem npmpackages to the latest exact versions.

## Instructions

- Read migration guild https://wagmi.sh/react/guides/migrate-from-v2-to-v3
- Ensure viem and vagmi version is the latest
- Ensure all packages uses the same version of both libs
- Ensure the version is exact - no dynamic versions allowed like `latest` or `~` or `^`
- Run all tests
- Test web and mastra packages in the browser
- Test if ponder indexing works
- update skills like `web3-data-fetching` if needed