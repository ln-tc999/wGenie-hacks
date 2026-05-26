import { before, describe, it, after } from 'node:test';
import { network } from 'hardhat';
import { NetworkConnection } from 'hardhat/types/network';
import { env } from '../../../lib/env';
import { base } from 'viem/chains';
import {
  PlasmaVault,
  validateSetup,
  SETUP_RULE,
  MARKET_ID,
} from '@wgenie/fusion-sdk';
import { assert, expect } from 'chai';

import '@nomicfoundation/hardhat-toolbox-viem';

/**
 * Tests for the ERC20_VAULT_BALANCE_DEPENDENCY_MISSING setup validation rule.
 * Verifies that all markets have proper ERC20_VAULT_BALANCE dependency configured.
 */
describe('Setup rule ERC20_VAULT_BALANCE_DEPENDENCY_MISSING', () => {
  const BLOCK_NUMBER = 35789200;
  const PLASMA_VAULT = '0xe326df5357c931c42c58ca3e167727cf107207c6';
  const FUSE_MANAGER = '0xA6A7B66EbBb5CbfDFf3C83781193618ee4E22f4D';

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

  // Test that passes when all markets have proper ERC20_VAULT_BALANCE dependency
  it('should validate the vault setup with no errors and return success result', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    const marketIds = await plasmaVault.getMarketIds({
      include: ['fuses', 'balanceFuses'],
    });

    // Make sure ERC20_VAULT_BALANCE market is used in the vault
    const isErc20VaultBalanceMarketUsed = marketIds.includes(
      MARKET_ID.ERC20_VAULT_BALANCE,
    );
    assert.isTrue(
      isErc20VaultBalanceMarketUsed,
      'ERC20_VAULT_BALANCE market is not used in the vault',
    );

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.ERC20_VAULT_BALANCE_DEPENDENCY_MISSING,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'ERC20_VAULT_BALANCE_DEPENDENCY_MISSING',
      value: {
        status: 'ok',
        message: 'All markets have ERC20 vault balance dependency.',
      },
    });
  });

  // Test that fails when ERC20_VAULT_BALANCE dependency is missing from a market
  it('should fail validation when ERC20_VAULT_BALANCE dependency is removed from some market', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

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

    const morphoDependenciesBefore =
      await plasmaVault.getDependencyBalanceGraph(MARKET_ID.MORPHO);
    expect(morphoDependenciesBefore).to.include(MARKET_ID.ERC20_VAULT_BALANCE);
    await plasmaVault.updateDependencyBalanceGraph(
      fuseManagerClient,
      MARKET_ID.MORPHO,
      [], // just remove all dependencies including ERC20_VAULT_BALANCE
    );
    const morphoDependenciesAfter = await plasmaVault.getDependencyBalanceGraph(
      MARKET_ID.MORPHO,
    );
    expect(morphoDependenciesAfter).to.be.empty;

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.ERC20_VAULT_BALANCE_DEPENDENCY_MISSING,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'ERC20_VAULT_BALANCE_DEPENDENCY_MISSING',
      value: {
        status: 'error',
        message: 'Some markets are missing ERC20 vault balance dependency.',
        violations: {
          marketsMissingDependency: [
            {
              marketId: MARKET_ID.MORPHO,
              dependencies: [],
            },
          ],
        },
      },
    });
  });
});
