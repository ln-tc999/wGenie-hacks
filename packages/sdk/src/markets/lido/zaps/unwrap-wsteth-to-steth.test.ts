import { describe, it, expect } from 'vitest';
import { encodeFunctionData, erc20Abi, parseEther, maxUint256 } from 'viem';
import { mainnet } from 'viem/chains';
import { unwrapWstethToSteth } from './unwrap-wsteth-to-steth';
import { STETH_ADDRESS, WSTETH_ADDRESS } from '../lido.addresses';
import { wstEthAbi } from '../abi/wsteth.abi';
import { zapInAllowanceAbi } from '../../../abi/zap-in-allowance.abi';
import { ANVIL_TEST_ACCOUNT } from '../../../lib/test-accounts';

const FUSION_STETH_LOOPING_ETHEREUM_ADDRESS =
  '0xB8a451107A9f87FDe481D4D686247D6e43Ed715e';
const ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS = ANVIL_TEST_ACCOUNT[0].address;

describe('unwrapWstethToSteth', () => {
  it('should return correct zap calls for wstETH to stETH conversion', () => {
    const wstEthAmount = parseEther('1');
    const minStEthOut = parseEther('0.995'); // 0.5% slippage
    const wstEthAddress = WSTETH_ADDRESS[mainnet.id];
    const stEthAddress = STETH_ADDRESS[mainnet.id];

    const zapInput = unwrapWstethToSteth.zap({
      chainId: mainnet.id,
      tokenInAmount: wstEthAmount,
      tokenOutMinAmount: minStEthOut,
      zapInAllowanceContractAddress: ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS,
      plasmaVaultAddress: FUSION_STETH_LOOPING_ETHEREUM_ADDRESS,
    });

    expect(zapInput).toEqual({
      tokenOutMinAmount: minStEthOut,
      nativeTokenAmount: 0n,
      assetsToRefundToSender: [],
      zapCalls: [
        {
          target: ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: zapInAllowanceAbi,
            functionName: 'transferApprovedAssets',
            args: [wstEthAddress, wstEthAmount],
          }),
          nativeTokenAmount: 0n,
        },
        {
          target: wstEthAddress,
          data: encodeFunctionData({
            abi: wstEthAbi,
            functionName: 'unwrap',
            args: [wstEthAmount],
          }),
          nativeTokenAmount: 0n,
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
      unwrapWstethToSteth.zap({
        chainId: 42161, // Arbitrum
        tokenInAmount: parseEther('1'),
        tokenOutMinAmount: parseEther('0.995'),
        zapInAllowanceContractAddress: ZAP_IN_ALLOWANCE_CONTRACT_ADDRESS,
        plasmaVaultAddress: FUSION_STETH_LOOPING_ETHEREUM_ADDRESS,
      }),
    ).toThrow('Unwrap wstETH to stETH is only supported on Ethereum Mainnet');
  });
});
