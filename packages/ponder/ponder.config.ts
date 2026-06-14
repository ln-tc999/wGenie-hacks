import { createConfig } from 'ponder';
import { erc4626ABI } from './abis/erc4626ABI';
import { treasuryABI } from './abis/treasuryABI';
import { mantle, mantleSepoliaTestnet } from 'viem/chains';
import { getChainVaults, getChainStartBlock, getTreasuryAddresses, getTreasuryStartBlock } from './src/contracts';

export default createConfig({
  database: {
    kind: 'postgres',
    connectionString: process.env.PONDER_DATABASE_URL,
  },
  chains: {
    mantle: {
      id: mantle.id,
      rpc: process.env.PONDER_RPC_URL_MANTLE,
    },
    mantle_sepolia: {
      id: mantleSepoliaTestnet.id,
      rpc: process.env.PONDER_RPC_URL_MANTLE_SEPOLIA,
    },
  },
  contracts: {
    ERC4626: {
      abi: erc4626ABI,
      chain: {
        mantle: {
          address: getChainVaults(mantle.id).map((vault) => vault.address),
          startBlock: getChainStartBlock(mantle.id),
        },
      },
    },
    WalletGenieTreasury: {
      abi: treasuryABI,
      chain: {
        mantle_sepolia: {
          address: getTreasuryAddresses(mantleSepoliaTestnet.id),
          startBlock: getTreasuryStartBlock(mantleSepoliaTestnet.id),
        },
      },
    },
  },
});
