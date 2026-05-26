/**
 * Plasma Vault Tools
 *
 * Tools for interacting with wGenie Fusion Plasma Vaults.
 * These tools enable AI agents to query vault information,
 * TVL, fees, fuses, and role permissions.
 */

export { listVaultsTool } from './list-vaults';
export { getVaultInfoTool } from './get-vault-info';
export { getVaultTvlTool } from './get-vault-tvl';
export { getVaultFusesTool } from './get-vault-fuses';
export { getVaultFeesTool } from './get-vault-fees';
export { checkRoleTool } from './check-role';

// Re-export utilities for external use
export { getPublicClient, isChainSupported, CHAIN_NAMES, SUPPORTED_CHAINS } from './utils/viem-clients';
export {
  loadVaultsRegistry,
  filterVaults,
  getVaultByAddress,
  getAllTags,
  getVaultChainIds,
  type VaultEntry,
  type VaultFilterOptions,
} from './utils/vaults-registry';
