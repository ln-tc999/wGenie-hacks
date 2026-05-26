import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { ANVIL_TEST_ACCOUNT } from '../../lib/test-accounts';
import { base } from 'viem/chains';

describe('PlasmaVault - removeFuses', () => {
  const BLOCK_NUMBER = 35740187;
  const PLASMA_VAULT = '0xc4c00d8b323f37527eeda27c87412378be9f68ec';
  const FUSE_MANAGER = '0xA21603c271C6f41CdC83E70a0691171eBB7db40A';
  const NOT_FUSE_MANAGER = ANVIL_TEST_ACCOUNT[0].address;

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

  it('should remove fuses from Plasma Vault by Fuse Manager', async () => {
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

    const currentFuses = await plasmaVault.getFuses();

    expect(currentFuses).to.deep.equal([
      '0x8Aad082F04d04d1dB2e92160bAa630e31C22C073',
      '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
      '0x44dcB8A4c40FA9941d99F409b2948FE91B6C15d5',
      '0x1Df60F2A046F3Dce8102427e091C1Ea99aE1d774',
      '0x20f305Ce4fC12F9171Fcd7C2fBcD7D11f6119265',
      '0x35f44aD1D9F2773dA05F4664bf574C760bA47bf6',
      '0xDE3FD3A25534471e92C5940d418B0582802b17B6',
      '0xae93EF3cf337b9599F0dfC12520c3C281637410F',
    ]);
    await plasmaVault.removeFuses(fuseManagerClient, [
      '0x8Aad082F04d04d1dB2e92160bAa630e31C22C073',
      '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
      '0x44dcB8A4c40FA9941d99F409b2948FE91B6C15d5',
      '0x1Df60F2A046F3Dce8102427e091C1Ea99aE1d774',
    ]);

    expect(await plasmaVault.getFuses()).to.deep.equal([
      '0xae93EF3cf337b9599F0dfC12520c3C281637410F',
      '0xDE3FD3A25534471e92C5940d418B0582802b17B6',
      '0x35f44aD1D9F2773dA05F4664bf574C760bA47bf6',
      '0x20f305Ce4fC12F9171Fcd7C2fBcD7D11f6119265',
    ]);
  });

  it('should throw error early if account is not Fuse Manager', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [NOT_FUSE_MANAGER],
    });
    const notFuseManagerClient = await viem.getWalletClient(NOT_FUSE_MANAGER);
    await testClient.setBalance({
      address: NOT_FUSE_MANAGER,
      value: BigInt(1e18),
    });

    try {
      await plasmaVault.removeFuses(notFuseManagerClient, [
        ANVIL_TEST_ACCOUNT[0].address,
      ]);
      expect.fail('Expected function to throw an error');
    } catch (error) {
      expect((error as Error).message).to.include(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 does not have FUSE_MANAGER_ROLE',
      );
    }
  });
});
