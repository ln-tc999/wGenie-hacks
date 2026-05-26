import { PlasmaVault, Prehook } from '@wgenie/fusion-sdk';
import { assert, expect } from 'chai';
import { before, describe, it, after } from 'node:test';
import { network } from 'hardhat';
import { NetworkConnection } from 'hardhat/types/network';
import { env } from '../../lib/env';
import { toHex, zeroAddress } from 'viem';

describe('PlasmaVault - setPreHookImplementations', () => {
  let connection: NetworkConnection<'l1'>;

  const BLOCK_NUMBER = 23370276;
  const PLASMA_VAULT_ADDRESS = '0xd731f94c778f7c1090e2e0d797150a647de5188a';
  const ATOMIST = '0x000cA4853bBDca1347f190bbF31B5Bb564A849Be';
  const PRE_HOOKS_MANAGER_ROLE = 301n;

  const ADD_FUSES_PREHOOK: Prehook = {
    selector: '0x3e3a86e0', // addFuses
    implementation: '0x0CF053385492FeF81e538F849E1e5308bEFC1A5C', // AUTO_REBALANCE_IGNORING_DUST
    substrates: [],
  };
  const DEPOSIT_PREHOOK: Prehook = {
    selector: '0x6e553f65', // deposit
    implementation: '0x0CF053385492FeF81e538F849E1e5308bEFC1A5C', // AUTO_REBALANCE_IGNORING_DUST
    substrates: [toHex(1, { size: 32 })],
  };
  const DEPOSIT_ZERO_PREHOOK: Prehook = {
    selector: '0x6e553f65', // deposit
    implementation: zeroAddress,
    substrates: [],
  };
  const DEPOSIT_PREHOOK_BUT_DIFFERENT_SELECTOR: Prehook = {
    ...DEPOSIT_PREHOOK,
    selector: '0xb460af94', // withdraw
  };

  before(async () => {
    connection = await network.connect({
      network: 'hardhatMainnet',
      chainType: 'l1',
      override: {
        forking: {
          url: env.RPC_URL_MAINNET,
          blockNumber: BLOCK_NUMBER,
        },
        gasPrice: 20000000000, // 20 gwei
      },
    });
  });

  after(async () => {
    await connection.close();
  });

  it('edit prehooks', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const [prehooksManagerClient] = await viem.getWalletClients();
    const testClient = await viem.getTestClient();

    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [ATOMIST],
    });
    const atomistClient = await viem.getWalletClient(ATOMIST);

    const plasmaVault = await PlasmaVault.create(
      publicClient,
      PLASMA_VAULT_ADDRESS,
    );

    await testClient.setBalance({
      address: ATOMIST,
      value: BigInt(1e18),
    });

    assert(
      prehooksManagerClient?.account.address,
      'prehooksManagerClient has no address',
    );

    await plasmaVault.grantRole(
      atomistClient,
      PRE_HOOKS_MANAGER_ROLE,
      prehooksManagerClient.account.address,
      0,
    );
    await testClient.setBalance({
      address: prehooksManagerClient.account.address,
      value: BigInt(1e18),
    });

    /**
     * should set implementations to empty prehook config by Prehooks Manager
     */
    await plasmaVault.setPreHookImplementations(prehooksManagerClient, [
      ADD_FUSES_PREHOOK,
    ]);
    const prehooksInfoAfter_1 = await plasmaVault.getPrehooksInfo();
    expect(prehooksInfoAfter_1).to.deep.equal([ADD_FUSES_PREHOOK]);

    /**
     * should add a new prehook item to the list if selector is not in the list
     */
    await plasmaVault.setPreHookImplementations(prehooksManagerClient, [
      DEPOSIT_PREHOOK,
    ]);
    const prehooksInfoAfter_2 = await plasmaVault.getPrehooksInfo();
    expect(prehooksInfoAfter_2).to.deep.equal([
      ADD_FUSES_PREHOOK,
      DEPOSIT_PREHOOK,
    ]);

    /**
     * no effect if sent prehook config is empty
     */
    await plasmaVault.setPreHookImplementations(prehooksManagerClient, []);
    const prehooksInfoAfter_3 = await plasmaVault.getPrehooksInfo();
    expect(prehooksInfoAfter_3).to.deep.equal([
      ADD_FUSES_PREHOOK,
      DEPOSIT_PREHOOK,
    ]);

    /**
     * should disable prehook if zero address is sent
     */
    await plasmaVault.setPreHookImplementations(prehooksManagerClient, [
      DEPOSIT_ZERO_PREHOOK,
    ]);
    const prehooksInfoAfter_4 = await plasmaVault.getPrehooksInfo();
    expect(prehooksInfoAfter_4).to.deep.equal([ADD_FUSES_PREHOOK]);

    /**
     * should append another prehook item to the list if different selector
     */
    await plasmaVault.setPreHookImplementations(prehooksManagerClient, [
      DEPOSIT_PREHOOK_BUT_DIFFERENT_SELECTOR,
    ]);
    const prehooksInfoAfter_5 = await plasmaVault.getPrehooksInfo();
    expect(prehooksInfoAfter_5).to.deep.equal([
      ADD_FUSES_PREHOOK,
      DEPOSIT_PREHOOK_BUT_DIFFERENT_SELECTOR,
    ]);
  });
});
