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
import { Hex, pad } from 'viem';
import { expect } from 'chai';

import '@nomicfoundation/hardhat-toolbox-viem';

/**
 * Tests for the ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS setup validation rule.
 * Verifies that all ERC20 token substrates used in markets are properly tracked in the vault balance.
 */
describe('Setup rule ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS', () => {
  const BLOCK_NUMBER = 35755465;
  const PLASMA_VAULT = '0x1166250d1d6b5a1dbb73526257f6bb2bbe235295';
  const FUSE_MANAGER = '0xA21603c271C6f41CdC83E70a0691171eBB7db40A';
  const CBBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
  const CBBTC_SUBSTRATE = pad(CBBTC, { size: 32 }).toLowerCase() as Hex;

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

  // Test that passes when all ERC20 substrates are properly tracked
  it('should validate the vault setup with no errors and return success result', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS',
      value: {
        status: 'ok',
        message: 'All ERC20 substrates are tracked in the vault.',
      },
    });
  });

  // Test that fails when a substrate is added to a market but not tracked in ERC20_VAULT_BALANCE
  it('should fail validation when cbBTC substrate is added to MORPHO_FLASH_LOAN market but not tracked', async () => {
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

    const currentSubstrates = await plasmaVault.getMarketSubstrates(
      MARKET_ID.MORPHO_FLASH_LOAN,
    );

    await plasmaVault.grantMarketSubstrates(
      fuseManagerClient,
      MARKET_ID.MORPHO_FLASH_LOAN,
      [...currentSubstrates, CBBTC_SUBSTRATE],
    );

    // Verify cbBTC was added
    const newSubstrates = await plasmaVault.getMarketSubstrates(
      MARKET_ID.MORPHO_FLASH_LOAN,
    );
    expect(newSubstrates).to.include(CBBTC_SUBSTRATE);

    // Verify cbBTC is not tracked in ERC20_VAULT_BALANCE
    const trackedTokens = await plasmaVault.getMarketSubstrates(
      MARKET_ID.ERC20_VAULT_BALANCE,
    );
    expect(trackedTokens).to.not.include(CBBTC_SUBSTRATE);

    const validationResult = await validateSetup(
      plasmaVault,
      SETUP_RULE.ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS,
    );

    expect(validationResult).to.deep.equal({
      ruleId: 'ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS',
      value: {
        status: 'info',
        message: 'Some ERC20 substrates are not tracked in the vault.',
        violations: {
          notTrackedTokens: [
            {
              tokenAddress: CBBTC.toLowerCase(),
              marketIds: [MARKET_ID.MORPHO_FLASH_LOAN],
            },
          ],
        },
      },
    });
  });
});
