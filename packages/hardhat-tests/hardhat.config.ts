import type { HardhatUserConfig } from 'hardhat/config';
import { base, mainnet } from 'viem/chains';

import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-node-test-runner';

import { env } from './lib/env';

// @ts-expect-error
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    version: '0.8.28',
  },
  networks: {
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
      chainId: mainnet.id,
      forking: {
        url: env.RPC_URL_MAINNET,
      },
    },
    hardhatBase: {
      type: 'edr-simulated',
      chainType: 'op',
      chainId: base.id,
      forking: {
        url: env.RPC_URL_BASE,
      },
    },
  },
};

export default config;
