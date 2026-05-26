import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { FUSE_TYPES } from './fuse-data';

/**
 * Core fuse interface definitions
 */
const CORE_INTERFACES = {
  IFuse: {
    name: 'IFuse',
    description: 'Core interface that all action fuses implement. Provides enter() and exit() functions for protocol interactions.',
    solidity: `interface IFuse is IFuseCommon {
    /// @notice Execute an action on the protocol (e.g., supply, swap)
    /// @param data_ ABI-encoded action parameters
    function enter(bytes calldata data_) external;

    /// @notice Reverse an action (e.g., withdraw, close position)
    /// @param data_ ABI-encoded action parameters
    function exit(bytes calldata data_) external;
}`,
    methods: [
      { name: 'enter', params: 'bytes calldata data_', description: 'Execute protocol action (supply, swap, etc.)' },
      { name: 'exit', params: 'bytes calldata data_', description: 'Reverse action (withdraw, close, etc.)' },
    ],
  },
  IFuseCommon: {
    name: 'IFuseCommon',
    description: 'Common interface providing MARKET_ID for fuse categorization.',
    solidity: `interface IFuseCommon {
    /// @notice Returns the market identifier for this fuse
    /// @return Market ID used to categorize and route fuse actions
    function MARKET_ID() external view returns (uint256);
}`,
    methods: [{ name: 'MARKET_ID', params: '', description: 'Returns unique market identifier for the fuse' }],
  },
  IMarketBalanceFuse: {
    name: 'IMarketBalanceFuse',
    description: 'Interface for balance-tracking fuses that report USD value of positions.',
    solidity: `interface IMarketBalanceFuse {
    /// @notice Get the current balance in USD (18 decimals)
    /// @return USD value of the tracked position with 18 decimal precision
    function balanceOf() external returns (uint256);
}`,
    methods: [{ name: 'balanceOf', params: '', description: 'Returns USD value of position (18 decimals)' }],
  },
};

export const getFuseInterfacesTool = createTool({
  id: 'get-fuse-interfaces',
  description: `Get information about core fuse interfaces (IFuse, IFuseCommon, IMarketBalanceFuse).
Explains how fuses work, their methods, and the different fuse types.
Use this to understand fuse architecture and capabilities.`,
  inputSchema: z.object({
    interfaceName: z
      .enum(['IFuse', 'IFuseCommon', 'IMarketBalanceFuse', 'all'])
      .optional()
      .default('all')
      .describe('Specific interface to get details for, or "all" for all interfaces'),
    includeFuseTypes: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include descriptions of different fuse types'),
  }),
  outputSchema: z.object({
    interfaces: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        solidity: z.string(),
        methods: z.array(
          z.object({
            name: z.string(),
            params: z.string(),
            description: z.string(),
          })
        ),
      })
    ),
    fuseTypes: z
      .array(
        z.object({
          type: z.string(),
          description: z.string(),
        })
      )
      .optional(),
    howFusesWork: z.string(),
  }),
  execute: async ({ interfaceName, includeFuseTypes }) => {

    const interfaces =
      interfaceName === 'all'
        ? Object.values(CORE_INTERFACES)
        : [CORE_INTERFACES[interfaceName as keyof typeof CORE_INTERFACES]].filter(Boolean);

    return {
      interfaces,
      fuseTypes: includeFuseTypes ? FUSE_TYPES : undefined,
      howFusesWork: `## How Fuses Work

Fuses are smart contract adapters that connect Plasma Vaults to external DeFi protocols.

### Execution Flow
1. **Alpha (strategist)** calls PlasmaVault.execute() with FuseAction[]
2. Each FuseAction contains: fuse address + encoded parameters
3. PlasmaVault delegates call to the fuse's enter() or exit() function
4. Fuse interacts with external protocol on behalf of the vault

### Balance Tracking
- Balance fuses implement IMarketBalanceFuse
- They report positions in USD (18 decimals)
- Used by PlasmaVault.getTotalAssets() for TVL calculation

### Market IDs
- Each fuse has a MARKET_ID() that categorizes it
- Market IDs group related fuses (e.g., all Aave V3 fuses share a market ID)
- Used for access control and balance aggregation`,
    };
  },
});
