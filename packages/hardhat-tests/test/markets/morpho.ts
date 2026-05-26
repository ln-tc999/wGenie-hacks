import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault, Morpho } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';

import '@nomicfoundation/hardhat-toolbox-viem';

describe('Morpho Market - supply and withdraw', { timeout: 60_000 }, () => {
  // wGenie USDC Prime Ethereum vault — has Morpho supply fuse installed
  const BLOCK_NUMBER = 21904278;
  const PLASMA_VAULT = '0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2';
  const ALPHA = '0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6';

  // Actual Morpho supply fuse installed on this vault at this block (MARKET_ID: 14)
  const MORPHO_SUPPLY_FUSE =
    '0xD08Cb606CEe700628E55b0B0159Ad65421E6c8Df';

  // Morpho Blue USDC/WETH market on mainnet
  const MORPHO_MARKET_ID =
    '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc' as `0x${string}`;

  let connection: NetworkConnection<'l1'>;

  before(async () => {
    connection = await network.connect({
      network: 'hardhatMainnet',
      chainType: 'l1',
      override: {
        forking: {
          url: env.RPC_URL_MAINNET,
          blockNumber: BLOCK_NUMBER,
        },
      },
    });
  });

  after(async () => {
    await connection.close();
  });

  it('should create supply and withdraw actions for Morpho', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();

    // @ts-expect-error - hardhat viem types mismatch
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);
    const morpho = new Morpho(plasmaVault, {
      supplyFuse: MORPHO_SUPPLY_FUSE,
    });

    // Impersonate alpha
    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [ALPHA],
    });
    await testClient.setBalance({
      address: ALPHA,
      value: BigInt(1e18),
    });

    const supplyAmount = 1_000_000000n; // 1000 USDC

    // Create supply actions
    const supplyActions = morpho.supply(MORPHO_MARKET_ID, supplyAmount);
    expect(supplyActions).to.have.lengthOf(1);
    expect(supplyActions[0].fuse).to.be.a('string');
    expect(supplyActions[0].data).to.be.a('string');

    // Create withdraw actions
    const withdrawAmount = 500_000000n; // 500 USDC
    const withdrawActions = morpho.withdraw(MORPHO_MARKET_ID, withdrawAmount);
    expect(withdrawActions).to.have.lengthOf(1);
  });
});
