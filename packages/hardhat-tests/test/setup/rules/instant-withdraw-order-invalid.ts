import { before, describe, it, after } from 'node:test';
import { network } from 'hardhat';
import { NetworkConnection } from 'hardhat/types/network';
import { env } from '../../../lib/env';
import { base } from 'viem/chains';
import { PlasmaVault, validateSetup, SETUP_RULE } from '@wgenie/fusion-sdk';
import { expect } from 'chai';
import { Hex, isAddressEqual } from 'viem';

import '@nomicfoundation/hardhat-toolbox-viem';

/**
 * Tests for the INSTANT_WITHDRAW_ORDER_INVALID setup validation rule.
 * Verifies that instant withdrawal configurations don't reference removed fuses or substrates.
 */
describe('Setup rule INSTANT_WITHDRAW_ORDER_INVALID', () => {
  const BLOCK_NUMBER = 38600262;
  const PLASMA_VAULT = '0x352722980808bd004afab050c15c4147747dd133';
  const OWNER = '0x09f3612f0709f7406583c378C3f315e9B36aD0D6';

  // Test data - Base network addresses
  const AAVE_V3_SUPPLY_FUSE = '0x26fD6EF391E98C78CfCA27e00c3d15be4D941625';
  const USDC_SUBSTRATE =
    '0x000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' as Hex;
  const AAVE_V3_MARKET_ID = 1n;

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

  it('should fail validation when instant withdrawal config has stale entries after fuse removal', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    const testClient = await viem.getTestClient();
    await testClient.request({
      method: 'hardhat_setNextBlockBaseFeePerGas',
      params: ['0x1'],
    });

    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [OWNER],
    });
    await testClient.setBalance({
      address: OWNER,
      value: BigInt(1e18),
    });
    const atomistClient = await viem.getWalletClient(OWNER);

    // Validation should pass at this point
    const validationResultBefore = await validateSetup(
      plasmaVault,
      SETUP_RULE.INSTANT_WITHDRAW_ORDER_INVALID,
    );
    expect(validationResultBefore.value.status).to.equal('ok');

    // Make config invalid: Remove the fuse from vault
    await plasmaVault.removeFuses(atomistClient, [AAVE_V3_SUPPLY_FUSE]);

    // Verify fuse was removed
    const fusesAfterRemoval = await plasmaVault.getFuses();
    expect(
      fusesAfterRemoval.some((f) => isAddressEqual(f, AAVE_V3_SUPPLY_FUSE)),
    ).to.be.false;

    // Validation should fail now
    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.INSTANT_WITHDRAW_ORDER_INVALID,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'INSTANT_WITHDRAW_ORDER_INVALID',
      value: {
        status: 'error',
        message: 'Stale instant withdrawal configurations detected.',
        violations: {
          invalidConfigs: [
            {
              fuseAddress: AAVE_V3_SUPPLY_FUSE,
              substrate: USDC_SUBSTRATE,
              marketId: AAVE_V3_MARKET_ID,
              reason: 'fuse_not_in_vault',
            },
          ],
        },
      },
    });
  });
});
