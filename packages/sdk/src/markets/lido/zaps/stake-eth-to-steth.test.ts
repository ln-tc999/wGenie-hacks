import { describe, it, expect } from 'vitest';
import {
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  parseEther,
  zeroAddress,
} from 'viem';
import { mainnet } from 'viem/chains';
import { stakeEthToSteth } from './stake-eth-to-steth';
import { STETH_ADDRESS } from '../lido.addresses';
import { stEthAbi } from '../abi/steth.abi';
import { ANVIL_TEST_ACCOUNT } from '../../../lib/test-accounts';

const FUSION_STETH_LOOPING_ETHEREUM_ADDRESS =
  '0xB8a451107A9f87FDe481D4D686247D6e43Ed715e';
const ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS = ANVIL_TEST_ACCOUNT[0].address;

describe('stakeEthToSteth', () => {
  it('should return correct zap calls for ETH to stETH conversion', () => {
    const ethAmount = parseEther('1');
    const minStEthOut = parseEther('0.999'); // 0.1% slippage
    const stEthAddress = STETH_ADDRESS[mainnet.id];

    const zapInput = stakeEthToSteth.zap({
      chainId: mainnet.id,
      tokenInAmount: ethAmount,
      tokenOutMinAmount: minStEthOut,
      zapInAllowanceContractAddress: ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS,
      plasmaVaultAddress: FUSION_STETH_LOOPING_ETHEREUM_ADDRESS,
    });

    expect(zapInput).toEqual({
      tokenOutMinAmount: minStEthOut,
      nativeTokenAmount: ethAmount,
      assetsToRefundToSender: [],
      zapCalls: [
        {
          target: stEthAddress,
          data: encodeFunctionData({
            abi: stEthAbi,
            functionName: 'submit',
            args: [zeroAddress],
          }),
          nativeTokenAmount: ethAmount,
        },
        {
          target: stEthAddress,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [FUSION_STETH_LOOPING_ETHEREUM_ADDRESS, maxUint256],
          }),
          nativeTokenAmount: 0n,
        },
      ],
    });
  });

  it('should throw error for non-mainnet chains', () => {
    expect(() =>
      stakeEthToSteth.zap({
        chainId: 42161, // Arbitrum
        tokenInAmount: parseEther('1'),
        tokenOutMinAmount: parseEther('0.999'),
        zapInAllowanceContractAddress: ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS,
        plasmaVaultAddress: FUSION_STETH_LOOPING_ETHEREUM_ADDRESS,
      }),
    ).toThrow('Stake ETH to stETH is only supported on Ethereum Mainnet');
  });
});
