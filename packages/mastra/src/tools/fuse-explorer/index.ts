/**
 * Fuse Explorer Tools
 *
 * Tools for discovering, searching, and understanding wGenie Fusion fuses.
 * Fuses are smart contract adapters that connect Plasma Vaults to DeFi protocols.
 */

export { listFuseProtocolsTool } from './list-protocols';
export { searchFusesTool } from './search-fuses';
export { getProtocolFuseInfoTool } from './get-protocol-info';
export { getFuseInterfacesTool } from './get-fuse-interfaces';

// Re-export data types for consumers
export type { FuseProtocol } from './fuse-data';
export {
  FUSE_PROTOCOLS,
  FUSE_TYPES,
  CATEGORY_DESCRIPTIONS,
  getProtocolsByCategory,
  getProtocolById,
  searchFuses,
  getTotalFuseCount,
} from './fuse-data';
