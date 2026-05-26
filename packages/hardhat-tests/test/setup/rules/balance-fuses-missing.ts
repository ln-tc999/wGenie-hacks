import { before, describe, it, after } from 'node:test';
import { network } from 'hardhat';
import { NetworkConnection } from 'hardhat/types/network';
import { env } from '../../../lib/env';
import { base } from 'viem/chains';
import { PlasmaVault, validateSetup, SETUP_RULE } from '@wgenie/fusion-sdk';
import { assert, expect } from 'chai';
import '@nomicfoundation/hardhat-toolbox-viem';
import { TECH_MARKET_ID } from '@wgenie/fusion-sdk/src/markets/market-id';

/**
 * Tests for the BALANCE_FUSES_MISSING setup validation rule.
 * Verifies that all markets have balance fuse when marketId is used.
 */
describe('Setup rule BALANCE_FUSES_MISSING', () => {
  const BLOCK_NUMBER = 36008092;
  const PLASMA_VAULT = '0x352722980808bd004afab050c15c4147747dd133';
  const FUSE_MANAGER = '0x09f3612f0709f7406583c378C3f315e9B36aD0D6';
  const ZERO_BALANCE_FUSE_ADDRESS =
    '0x341D2459606FEB164A986767cB72Ddd8230744Fe';

  let connection: NetworkConnection<'op'>;

  before(async () => {
    connection = await network.connect({
      network: 'hardhatBase',
      chainType: 'op',
      override: {
        chainId: base.id,
        forking: {
          url: env.RPC_URL_BASE,
          blockNumber: BLOCK_NUMBER,
        },
      },
    });
  });

  after(async () => {
    await connection.close();
  });

  it('should fail validation when some markets are missing balance fuse when marketId is used.', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    const marketIdsToVerify = await plasmaVault.getMarketIds({
      include: ['fuses'],
    });

    const balanceFusesMarketIds = await plasmaVault.getMarketIds({
      include: ['balanceFuses'],
    });

    const marketIdsWithoutBalanceFuse = marketIdsToVerify.filter(
      (marketId) => !balanceFusesMarketIds.includes(marketId),
    );

    assert.isNotEmpty(
      marketIdsWithoutBalanceFuse,
      'All markets have balance fuse added.',
    );

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.BALANCE_FUSES_MISSING,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'BALANCE_FUSES_MISSING',
      value: {
        status: 'error',
        message: 'Some markets are missing balance fuses.',
        violations: {
          marketIdsWithoutBalanceFuse,
        },
      },
    });
  });

  // Test that passes when all markets have proper balance fuse when marketId is used.
  it('should validate the vault setup with no errors and return success result', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    const testClient = await viem.getTestClient();
    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [FUSE_MANAGER],
    });
    const fuseManagerClient = await viem.getWalletClient(FUSE_MANAGER);
    await testClient.setBalance({
      address: FUSE_MANAGER,
      value: BigInt(1e18),
    });
    await testClient.request({
      method: 'hardhat_setNextBlockBaseFeePerGas',
      params: ['0x1'],
    });

    const balanceFusesMarketIdsBefore = await plasmaVault.getMarketIds({
      include: ['balanceFuses'],
    });
    expect(balanceFusesMarketIdsBefore).to.not.include(
      TECH_MARKET_ID.ZERO_BALANCE_MARKET_ID,
    );

    await plasmaVault.addBalanceFuse(
      fuseManagerClient,
      ZERO_BALANCE_FUSE_ADDRESS,
      TECH_MARKET_ID.ZERO_BALANCE_MARKET_ID,
    );
    const balanceFusesMarketIdsAfter = await plasmaVault.getMarketIds({
      include: ['balanceFuses'],
    });
    expect(balanceFusesMarketIdsAfter).to.include(
      TECH_MARKET_ID.ZERO_BALANCE_MARKET_ID,
    );

    const marketIdsToVerify = await plasmaVault.getMarketIds({
      include: ['fuses'],
    });

    const marketIdsWithoutBalanceFuse = marketIdsToVerify.filter(
      (marketId) => !balanceFusesMarketIdsAfter.includes(marketId),
    );

    assert.isEmpty(
      marketIdsWithoutBalanceFuse,
      'Some markets are missing balance fuse.',
    );

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.BALANCE_FUSES_MISSING,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'BALANCE_FUSES_MISSING',
      value: {
        status: 'ok',
        message: 'This vault has all necessary balance fuses.',
      },
    });
  });
});
