import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import {
  PlasmaVault,
  ERC4626_ZAP_IN_WITH_NATIVE_TOKEN_ADDRESS,
  erc4626ZapInWithNativeTokenAbi,
} from '@wgenie/fusion-sdk';
import { mintRusdFromUsdc } from '@wgenie/fusion-sdk/src/markets/reservoir/zaps/mint-rusd-from-usdc';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { ANVIL_TEST_ACCOUNT } from '../../lib/test-accounts';
import { expectApproximately } from '../../lib/expect-approximately';
import { mainnet } from 'viem/chains';
import {
  erc20Abi,
  erc4626Abi,
  parseUnits,
  formatUnits,
  parseEther,
} from 'viem';

import '@nomicfoundation/hardhat-toolbox-viem';

describe('PlasmaVault - zapIn - mintRusdFromUsdc', { timeout: 100_000 }, () => {
  const BLOCK_NUMBER = 23898811;
  const PLASMA_VAULT = '0xe9385eff3f937fcb0f0085da9a3f53d6c2b4fb5f';
  const USER_ADDRESS = ANVIL_TEST_ACCOUNT[0].address;
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const USDC_WHALE = '0x6880166ceB5F8d83FB1169f8201048027a0664A3';
  const USDC_DECIMALS = 6;
  const IN_USDC_AMOUNT = parseUnits('1000', USDC_DECIMALS);
  const OUT_MIN_RUSD_AMOUNT = parseEther('0.995');

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

  it('should zap in USDC and receive Plasma Vault shares', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();

    // Setup: Transfer USDC from whale to test user
    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [USDC_WHALE],
    });
    const whaleClient = await viem.getWalletClient(USDC_WHALE);
    await testClient.setBalance({
      address: USDC_WHALE,
      value: parseEther('10'), // Give whale ETH for gas
    });

    // Transfer USDC from whale to user
    await whaleClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [USER_ADDRESS, IN_USDC_AMOUNT],
    });

    const userUsdcBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS],
    });
    expect(formatUnits(userUsdcBalance, USDC_DECIMALS)).to.be.equal('1000');

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

    const rusdAssetAddress = await publicClient.readContract({
      address: PLASMA_VAULT,
      abi: erc4626Abi,
      functionName: 'asset',
    });
    const rusdAssetDecimals = await publicClient.readContract({
      address: rusdAssetAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    });
    expect(rusdAssetDecimals).to.be.equal(18);

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

    // Approve zap contract to spend user's USDC
    await userClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [zapInAllowanceContractAddress, IN_USDC_AMOUNT],
    });

    const zapPayload = mintRusdFromUsdc.zap({
      chainId: mainnet.id,
      plasmaVaultAddress: PLASMA_VAULT,
      tokenInAmount: IN_USDC_AMOUNT,
      tokenOutMinAmount: OUT_MIN_RUSD_AMOUNT,
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
      '903.21814910320540603403',
    );

    const userAssetsInVaultAfter = await publicClient.readContract({
      address: PLASMA_VAULT,
      abi: erc4626Abi,
      functionName: 'convertToAssets',
      args: [userSharesAfter],
    });
    expect(formatUnits(userAssetsInVaultAfter, rusdAssetDecimals)).to.be.equal(
      '999.999999999999999999',
    );

    const userUsdcBalanceAfter = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [USER_ADDRESS],
    });
    expect(userUsdcBalanceAfter).to.be.equal(0n);
  });
});
