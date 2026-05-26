import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { PlasmaVault, AaveV3 } from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { erc20Abi } from 'viem';

import '@nomicfoundation/hardhat-toolbox-viem';

describe(
  'PlasmaVault - alpha execute with market classes',
  { timeout: 60_000 },
  () => {
    // wGenie USDC Prime Ethereum vault
    const BLOCK_NUMBER = 21904278;
    const PLASMA_VAULT = '0x43ee0243ea8cf02f7087d8b16c8d2007cc9c7ca2';
    const ALPHA = '0x6d3be3f86fb1139d0c9668bd552f05fcb643e6e6';

    // Actual Aave V3 supply fuse installed on this vault at this block
    const AAVE_V3_SUPPLY_FUSE =
      '0x465D639EB964158beE11f35E8fc23f704EC936a2';

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

    it('should execute supply and withdraw via PlasmaVault.execute()', async () => {
      const { viem } = connection;
      const publicClient = await viem.getPublicClient();
      const testClient = await viem.getTestClient();

      // @ts-expect-error - hardhat viem types mismatch
      const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);
      const aaveV3 = new AaveV3(plasmaVault, {
        supplyFuse: AAVE_V3_SUPPLY_FUSE,
      });

      // Impersonate alpha
      await testClient.request({
        method: 'hardhat_impersonateAccount',
        params: [ALPHA],
      });
      const alphaClient = await viem.getWalletClient(ALPHA);
      await testClient.setBalance({
        address: ALPHA,
        value: BigInt(1e18),
      });

      const assetAddress = plasmaVault.assetAddress;

      // Check vault balance before
      const vaultBalanceBefore = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [PLASMA_VAULT],
      });

      // Supply 1000 USDC to Aave V3
      const supplyAmount = 1_000_000000n;
      const supplyActions = aaveV3.supply(assetAddress, supplyAmount);

      // @ts-expect-error - hardhat viem types mismatch
      await plasmaVault.execute(alphaClient, [supplyActions]);

      // Check vault balance decreased after supply
      const vaultBalanceAfterSupply = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [PLASMA_VAULT],
      });

      expect(vaultBalanceBefore - vaultBalanceAfterSupply).to.equal(
        supplyAmount,
      );

      // Withdraw 500 USDC from Aave V3
      const withdrawAmount = 500_000000n;
      const withdrawActions = aaveV3.withdraw(assetAddress, withdrawAmount);

      // @ts-expect-error - hardhat viem types mismatch
      await plasmaVault.execute(alphaClient, [withdrawActions]);

      // Check vault balance increased after withdraw
      const vaultBalanceAfterWithdraw = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [PLASMA_VAULT],
      });

      expect(vaultBalanceAfterWithdraw - vaultBalanceAfterSupply).to.equal(
        withdrawAmount,
      );
    });
  },
);
