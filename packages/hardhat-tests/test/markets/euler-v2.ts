import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault, EulerV2 } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';

import '@nomicfoundation/hardhat-toolbox-viem';

describe('EulerV2 Market - supply and withdraw', { timeout: 60_000 }, () => {
  // wGenie USDC Prime Ethereum vault
  const BLOCK_NUMBER = 21904278;
  const PLASMA_VAULT = '0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2';

  // Euler V2 USDC vault on mainnet (Prime USDC)
  const EULER_VAULT = '0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9';

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

  it('should create supply and withdraw actions for EulerV2', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();

    // @ts-expect-error - hardhat viem types mismatch
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);
    const eulerV2 = new EulerV2(plasmaVault);

    const supplyAmount = 1_000_000000n; // 1000 USDC

    // Create supply actions with default subAccount (0x00)
    const supplyActions = eulerV2.supply(EULER_VAULT, supplyAmount);
    expect(supplyActions).to.have.lengthOf(1);
    expect(supplyActions[0].fuse).to.be.a('string');
    expect(supplyActions[0].data).to.be.a('string');

    // Create supply actions with specific subAccount
    const supplyActionsWithSub = eulerV2.supply(
      EULER_VAULT,
      supplyAmount,
      '0x01',
    );
    expect(supplyActionsWithSub).to.have.lengthOf(1);

    // Create withdraw actions
    const withdrawAmount = 500_000000n; // 500 USDC
    const withdrawActions = eulerV2.withdraw(EULER_VAULT, withdrawAmount);
    expect(withdrawActions).to.have.lengthOf(1);

    // Create withdraw actions with specific subAccount
    const withdrawActionsWithSub = eulerV2.withdraw(
      EULER_VAULT,
      withdrawAmount,
      '0x01',
    );
    expect(withdrawActionsWithSub).to.have.lengthOf(1);
  });
});
