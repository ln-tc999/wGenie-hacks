import { encodeFunctionData, erc20Abi, zeroAddress, maxUint256 } from 'viem';
import { mainnet } from 'viem/chains';
import { ZapConfig, ZapFn } from '../../../zaps/zaps.types';
import { STETH_ADDRESS } from '../lido.addresses';
import { stEthAbi } from '../abi/steth.abi';

const zap: ZapFn = ({
  chainId,
  plasmaVaultAddress,
  tokenInAmount: ethAmount,
  tokenOutMinAmount: stEthMinAmount,
}) => {
  if (chainId !== mainnet.id) {
    throw new Error('Stake ETH to stETH is only supported on Ethereum Mainnet');
  }

  const stEthAddress = STETH_ADDRESS[mainnet.id];

  if (!stEthAddress) {
    throw new Error('stETH address not configured');
  }

  // No referral address for Lido staking
  const noReferral = zeroAddress;

  return {
    tokenOutMinAmount: stEthMinAmount,
    zapCalls: [
      // Step 1: Stake ETH with Lido to receive stETH
      {
        target: stEthAddress,
        data: encodeFunctionData({
          abi: stEthAbi,
          functionName: 'submit',
          args: [noReferral],
        }),
        nativeTokenAmount: ethAmount,
      },
      // Step 2: Approve plasma vault to spend max stETH
      {
        target: stEthAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [plasmaVaultAddress, maxUint256],
        }),
        nativeTokenAmount: 0n,
      },
    ],
    assetsToRefundToSender: [],
    nativeTokenAmount: ethAmount,
  };
};

export const stakeEthToSteth = {
  tokenIn: 'chainNativeToken',
  tokenOut: STETH_ADDRESS[mainnet.id],
  id: 'stakeEthToSteth',
  label: 'Stake ETH',
  zap,
} as const satisfies ZapConfig;
