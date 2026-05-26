// Import the vaults registry directly - works with bundlers
import vaultsRegistry from '../../../../../../plasma-vaults.json';

/**
 * Vault entry from plasma-vaults.json
 */
export interface VaultEntry {
  name: string;
  address: string;
  chainId: number;
  protocol: string;
  tags: string[];
  startBlock: number;
  url: string;
}

/**
 * Load vaults from plasma-vaults.json
 * Returns the imported vaults array directly
 */
export function loadVaultsRegistry(): VaultEntry[] {
  return vaultsRegistry.vaults as VaultEntry[];
}

/**
 * Filter options for vault queries
 */
export interface VaultFilterOptions {
  chainId?: number;
  tags?: string[];
  nameContains?: string;
  protocol?: string;
}

/**
 * Filter vaults based on criteria
 */
export function filterVaults(options: VaultFilterOptions = {}): VaultEntry[] {
  let vaults = loadVaultsRegistry();

  if (options.chainId !== undefined) {
    vaults = vaults.filter((v) => v.chainId === options.chainId);
  }

  if (options.tags && options.tags.length > 0) {
    vaults = vaults.filter((v) => options.tags!.some((tag) => v.tags.includes(tag)));
  }

  if (options.nameContains) {
    const searchTerm = options.nameContains.toLowerCase();
    vaults = vaults.filter((v) => v.name.toLowerCase().includes(searchTerm));
  }

  if (options.protocol) {
    vaults = vaults.filter((v) => v.protocol.toLowerCase() === options.protocol!.toLowerCase());
  }

  return vaults;
}

/**
 * Get a single vault by address and chain ID
 */
export function getVaultByAddress(address: string, chainId: number): VaultEntry | undefined {
  const vaults = loadVaultsRegistry();
  return vaults.find(
    (v) => v.address.toLowerCase() === address.toLowerCase() && v.chainId === chainId,
  );
}

/**
 * Get all unique tags across all vaults
 */
export function getAllTags(): string[] {
  const vaults = loadVaultsRegistry();
  const tags = new Set<string>();
  vaults.forEach((v) => v.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

/**
 * Get all unique chain IDs with vaults
 */
export function getVaultChainIds(): number[] {
  const vaults = loadVaultsRegistry();
  return Array.from(new Set(vaults.map((v) => v.chainId))).sort((a, b) => a - b);
}

/**
 * Get vault count by chain
 */
export function getVaultCountByChain(): Record<number, number> {
  const vaults = loadVaultsRegistry();
  const counts: Record<number, number> = {};
  vaults.forEach((v) => {
    counts[v.chainId] = (counts[v.chainId] || 0) + 1;
  });
  return counts;
}
