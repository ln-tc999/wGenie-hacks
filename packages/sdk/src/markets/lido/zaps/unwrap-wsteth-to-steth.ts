import { encodeFunctionData, erc20Abi, maxUint256 } from 'viem';
import { mainnet } from 'viem/chains';
import { ZapConfig, ZapFn } from '../../../zaps/zaps.types';
import { STETH_ADDRESS, WSTETH_ADDRESS } from '../lido.addresses';
import { wstEthAbi } from '../abi/wsteth.abi';
import { zapInAllowanceAbi } from '../../../abi/zap-in-allowance.abi';

const zap: ZapFn = ({
  chainId,
  plasmaVaultAddress,
  tokenInAmount: wstEthAmount,
  tokenOutMinAmount: stEthMinAmount,
  zapInAllowanceContractAddress,
}) => {
  if (chainId !== mainnet.id) {
    throw new Error(
      'Unwrap wstETH to stETH is only supported on Ethereum Mainnet',
    );
  }

  const wstEthAddress = WSTETH_ADDRESS[mainnet.id];
  const stEthAddress = STETH_ADDRESS[mainnet.id];

  if (!wstEthAddress || !stEthAddress) {
    throw new Error('wstETH or stETH address not configured');
  }

  return {
    tokenOutMinAmount: stEthMinAmount,
    zapCalls: [
      // Step 1: Transfer wstETH from user to zap contract
      {
        target: zapInAllowanceContractAddress,
        data: encodeFunctionData({
          abi: zapInAllowanceAbi,
          functionName: 'transferApprovedAssets',
          args: [wstEthAddress, wstEthAmount],
        }),
        nativeTokenAmount: 0n,
      },
      // Step 2: Unwrap wstETH to stETH
      {
        target: wstEthAddress,
        data: encodeFunctionData({
          abi: wstEthAbi,
          functionName: 'unwrap',
          args: [wstEthAmount],
        }),
        nativeTokenAmount: 0n,
      },
      // Step 3: Approve plasma vault to spend max stETH
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
    nativeTokenAmount: 0n,
  };
};

export const unwrapWstethToSteth = {
  tokenIn: WSTETH_ADDRESS[mainnet.id],
  tokenOut: STETH_ADDRESS[mainnet.id],
  id: 'unwrapWstethToSteth',
  label: 'Unwrap wstETH',
  zap,
} as const satisfies ZapConfig;
