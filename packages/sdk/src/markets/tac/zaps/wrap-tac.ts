import { encodeFunctionData, erc20Abi } from 'viem';
import { tac } from 'viem/chains';
import { ZapConfig, ZapFn } from '../../../zaps/zaps.types';
import { WTAC_ADDRESS } from '../tac.addressees';
import { wtacAbi } from '../abi/wtac.abi';

const zap: ZapFn = ({
  chainId,
  plasmaVaultAddress,
  tokenInAmount: nativeTacAmount,
  tokenOutMinAmount: tacAmountOutMinAmount,
}) => {
  if (chainId !== tac.id) {
    throw new Error('Wrap TAC is only supported on TAC');
  }

  return {
    tokenOutMinAmount: tacAmountOutMinAmount,
    zapCalls: [
      {
        target: WTAC_ADDRESS[tac.id],
        data: encodeFunctionData({
          abi: wtacAbi,
          functionName: 'deposit',
        }),
        nativeTokenAmount: nativeTacAmount,
      },
      {
        target: WTAC_ADDRESS[tac.id],
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [plasmaVaultAddress, nativeTacAmount],
        }),
        nativeTokenAmount: 0n,
      },
    ],
    assetsToRefundToSender: [],
    nativeTokenAmount: nativeTacAmount,
  };
};

export const wrapTac = {
  tokenIn: 'chainNativeToken',
  tokenOut: WTAC_ADDRESS[tac.id],
  id: 'wrapTac',
  label: 'Wrap TAC',
  zap,
} as const satisfies ZapConfig;
