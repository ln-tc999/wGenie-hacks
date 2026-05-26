import { createConfig } from 'ponder';
import { erc4626ABI } from './abis/erc4626ABI';
import { arbitrum, base, mainnet, plasma, unichain } from 'viem/chains';
import { getChainStartBlock, getChainVaults } from './src/contracts';

export default createConfig({
  database: {
    kind: 'postgres',
    connectionString: process.env.PONDER_DATABASE_URL,
  },
  chains: {
    mainnet: {
      id: mainnet.id,
      rpc: process.env.PONDER_RPC_URL_MAINNET,
    },
    arbitrum: {
      id: arbitrum.id,
      rpc: process.env.PONDER_RPC_URL_ARBITRUM,
    },
    base: {
      id: base.id,
      rpc: process.env.PONDER_RPC_URL_BASE,
    },
    unichain: {
      id: unichain.id,
      rpc: process.env.PONDER_RPC_URL_UNICHAIN,
    },
    plasma: {
      id: plasma.id,
      rpc: process.env.PONDER_RPC_URL_PLASMA,
    },
  },
  contracts: {
    ERC4626: {
      abi: erc4626ABI,
      chain: {
        mainnet: {
          address: getChainVaults(mainnet.id).map((vault) => vault.address),
          startBlock: getChainStartBlock(mainnet.id),
        },
        base: {
          address: getChainVaults(base.id).map((vault) => vault.address),
          startBlock: getChainStartBlock(base.id),
        },
        arbitrum: {
          address: getChainVaults(arbitrum.id).map((vault) => vault.address),
          startBlock: getChainStartBlock(arbitrum.id),
        },
        unichain: {
          address: getChainVaults(unichain.id).map((vault) => vault.address),
          startBlock: getChainStartBlock(unichain.id),
        },
        plasma: {
          address: getChainVaults(plasma.id).map((vault) => vault.address),
          startBlock: getChainStartBlock(plasma.id),
        },
      },
    },
  },
});
