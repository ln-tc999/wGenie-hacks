import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import {
  PlasmaVault,
  unwrapWstethToSteth,
  ERC4626_ZAP_IN_WITH_NATIVE_TOKEN_ADDRESS,
  erc4626ZapInWithNativeTokenAbi,
} from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { ANVIL_TEST_ACCOUNT } from '../../lib/test-accounts';
import { expectApproximately } from '../../lib/expect-approximately';
import { mainnet } from 'viem/chains';
import {
  erc20Abi,
  erc4626Abi,
  parseEther,
  formatUnits,
  formatEther,
} from 'viem';

import '@nomicfoundation/hardhat-toolbox-viem';

describe(
  'PlasmaVault - zapIn - unwrapWstethToSteth',
  { timeout: 100_000 },
  () => {
    const BLOCK_NUMBER = 23898811;
    const PLASMA_VAULT = '0xb8a451107a9f87fde481d4d686247d6e43ed715e';
    const USER_ADDRESS = ANVIL_TEST_ACCOUNT[0].address;
    const WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
    const WSTETH_WHALE = '0x5313b39bf226ced2332C81eB97BB28c6fD50d1a3'; // wstETH whale address
    const IN_WSTETH_AMOUNT = parseEther('1');
    const OUT_MIN_STETH_AMOUNT = parseEther('1.145'); // wstETH unwraps to more stETH

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
          gasPrice: 20000000000, // 20 gwei
        },
      });
    });

    after(async () => {
      await connection.close();
    });

    it('should zap in wstETH and receive Plasma Vault shares', async () => {
      const { viem } = connection;
      const publicClient = await viem.getPublicClient();
      const testClient = await viem.getTestClient();

      // Setup: Transfer wstETH from whale to test user
      await testClient.request({
        method: 'hardhat_impersonateAccount',
        params: [WSTETH_WHALE],
      });
      const whaleClient = await viem.getWalletClient(WSTETH_WHALE);
      await testClient.setBalance({
        address: WSTETH_WHALE,
        value: parseEther('10'), // Give whale ETH for gas
      });

      // Transfer wstETH from whale to user
      await whaleClient.writeContract({
        address: WSTETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [USER_ADDRESS, IN_WSTETH_AMOUNT],
      });

      const userWstEthBalance = await publicClient.readContract({
        address: WSTETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS],
      });
      expect(formatEther(userWstEthBalance)).to.be.equal('1');

      // Setup user
      await testClient.request({
        method: 'hardhat_impersonateAccount',
        params: [USER_ADDRESS],
      });
      const userClient = await viem.getWalletClient(USER_ADDRESS);
      await testClient.setBalance({
        address: USER_ADDRESS,
        value: parseEther('10'), // Give user ETH for gas
      });

      const plasmaVault = await PlasmaVault.create(
        // @ts-expect-error
        publicClient,
        PLASMA_VAULT,
      );

      const userSharesBefore = await publicClient.readContract({
        address: PLASMA_VAULT,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS],
      });
      expect(userSharesBefore).to.be.equal(0n);

      const sharesDecimals = await publicClient.readContract({
        address: PLASMA_VAULT,
        abi: erc20Abi,
        functionName: 'decimals',
      });
      expect(sharesDecimals).to.be.equal(20);

      const assetAddress = await publicClient.readContract({
        address: PLASMA_VAULT,
        abi: erc4626Abi,
        functionName: 'asset',
      });
      const assetDecimals = await publicClient.readContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'decimals',
      });
      expect(assetDecimals).to.be.equal(18);

      const zapContractAddress =
        ERC4626_ZAP_IN_WITH_NATIVE_TOKEN_ADDRESS[mainnet.id];

      if (!zapContractAddress) {
        throw new Error('ERC4626 ZapIn contract not configured for mainnet');
      }

      const zapInAllowanceContractAddress = await publicClient.readContract({
        address: zapContractAddress,
        abi: erc4626ZapInWithNativeTokenAbi,
        functionName: 'ZAP_IN_ALLOWANCE_CONTRACT',
      });

      // Approve zap contract to spend user's wstETH
      await userClient.writeContract({
        address: WSTETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [zapInAllowanceContractAddress, IN_WSTETH_AMOUNT],
      });

      const zapPayload = unwrapWstethToSteth.zap({
        chainId: mainnet.id,
        plasmaVaultAddress: PLASMA_VAULT,
        tokenInAmount: IN_WSTETH_AMOUNT,
        tokenOutMinAmount: OUT_MIN_STETH_AMOUNT,
        zapInAllowanceContractAddress,
      });

      await plasmaVault.zapIn(
        // @ts-expect-error
        userClient,
        zapPayload,
      );

      const userSharesAfter = await publicClient.readContract({
        address: PLASMA_VAULT,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS],
      });
      expectApproximately(
        formatUnits(userSharesAfter, sharesDecimals),
        '1.1782349000038071191',
      );

      const userAssetsInVaultAfter = await publicClient.readContract({
        address: PLASMA_VAULT,
        abi: erc4626Abi,
        functionName: 'convertToAssets',
        args: [userSharesAfter],
      });
      expect(formatUnits(userAssetsInVaultAfter, assetDecimals)).to.be.equal(
        '1.220440216030487241',
      );

      const userWstEthBalanceAfter = await publicClient.readContract({
        address: WSTETH_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS],
      });
      expect(userWstEthBalanceAfter).to.be.equal(0n);
    });
  },
);
