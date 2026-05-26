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
import { expect } from 'chai';
import { Hex } from 'viem';

import '@nomicfoundation/hardhat-toolbox-viem';

/**
 * Test suite for validating Morpho markets price feed requirements in Plasma Vaults.
 *
 * These tests verify that the MORPHO_MARKETS_WITHOUT_PRICE_FEED setup rule correctly
 * identifies when Morpho markets contain tokens that lack price feed data in the
 * price oracle middleware.
 */
describe('Plasma Vault Morpho price feeds validation on Base chain', () => {
  const BLOCK_NUMBER = 35755465;
  const PLASMA_VAULT = '0x1166250d1d6b5a1dbb73526257f6bb2bbe235295';
  const FUSE_MANAGER = '0xA21603c271C6f41CdC83E70a0691171eBB7db40A';
  // Morpho market ID that contains tokens without price feeds (used for negative testing)
  const MORPHO_MARKET_ID_WITHOUT_PRICE_FEED =
    '0x5fda67e2274d50fb63955db09382daf24270ae32f2924d31039fec3c50cbfbe4' as Hex;

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

  /**
   * Test case: Validates that a properly configured vault passes price feed validation.
   *
   * This test verifies that when all Morpho markets in the vault have tokens with
   * valid price feeds, the validation rule returns a success result.
   */
  it('should validate the vault setup with no errors and return success result', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.MORPHO_MARKETS_WITHOUT_PRICE_FEED,
    );

    // Expecting validation to pass for this vault
    expect(validationResult).to.deep.equal({
      ruleId: 'MORPHO_MARKETS_WITHOUT_PRICE_FEED',
      value: {
        status: 'ok',
        message: 'All Morpho market tokens have price feeds.',
      },
    });
  });

  /**
   * Test case: Validates that adding a Morpho market without price feeds triggers validation errors.
   *
   * This test simulates adding a Morpho market that contains tokens without corresponding
   * price feeds in the price oracle middleware. The validation should detect this issue
   * and return detailed information about the problematic market and tokens.
   *
   * Steps:
   * 1. Impersonate the fuse manager to gain vault modification permissions
   * 2. Add a Morpho market known to have tokens without price feeds
   * 3. Run validation and verify it detects the missing price feeds
   * 4. Verify the validation result contains detailed error information
   */
  it('should fail validation when Morpho market without price feed is added', async () => {
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

    // Set low gas fees to avoid "maxFeePerGas too low" errors in test environment
    await testClient.request({
      method: 'hardhat_setNextBlockBaseFeePerGas',
      params: ['0x1'],
    });

    // Get current Morpho market substrates from the vault
    const currentSubstrates = await plasmaVault.getMarketSubstrates(
      MARKET_ID.MORPHO,
    );

    // Add the problematic Morpho market (one that has tokens without price feeds)
    await plasmaVault.grantMarketSubstrates(
      fuseManagerClient,
      MARKET_ID.MORPHO,
      [...currentSubstrates, MORPHO_MARKET_ID_WITHOUT_PRICE_FEED],
    );

    // Verify the problematic market was successfully added to the vault
    const newSubstrates = await plasmaVault.getMarketSubstrates(
      MARKET_ID.MORPHO,
    );
    expect(newSubstrates).to.include(MORPHO_MARKET_ID_WITHOUT_PRICE_FEED);

    // Run the validation rule to check for Morpho markets without price feeds
    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.MORPHO_MARKETS_WITHOUT_PRICE_FEED,
    );

    // Verify the validation detects the missing price feeds and returns detailed error info
    expect(validationResult).to.deep.equal({
      ruleId: 'MORPHO_MARKETS_WITHOUT_PRICE_FEED',
      value: {
        status: 'warning',
        message: 'Some Morpho market tokens do not have price feeds.',
        violations: {
          marketsWithoutPriceFeed: [
            {
              morphoMarketId: MORPHO_MARKET_ID_WITHOUT_PRICE_FEED, // The problematic market ID
              loanToken: '0x7Ba6F01772924a82D9626c126347A28299E98c98', // Loan token without price feed
              collateralToken: '0x7FcD174E80f264448ebeE8c88a7C4476AAF58Ea6', // Collateral token without price feed
            },
          ],
        },
      },
    });
  });
});
