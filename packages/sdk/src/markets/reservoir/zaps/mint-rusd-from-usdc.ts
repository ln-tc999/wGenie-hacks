import { USDC_ADDRESS } from '../../erc20/erc20.addresses';
import { RUSD_ADDRESS } from '../reservoir.addresses';
import { encodeFunctionData, erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { zapInAllowanceAbi } from '../../../abi/zap-in-allowance.abi';
import { ZapConfig, ZapFn } from '../../../zaps/zaps.types';
import { to18 } from '../../../utils/to18';
import { PEG_STABILITY_MODULE, CREDIT_ENFORCER } from '../reservoir.addresses';
import { creditEnforcerAbi } from '../abi/credit-enforcer.abi';

const USDC_DECIMALS = 6;

const zap: ZapFn = ({
  chainId,
  plasmaVaultAddress,
  tokenInAmount: usdcAmount,
  tokenOutMinAmount: rusdAmountOutMinAmount,
  zapInAllowanceContractAddress,
}) => {
  if (chainId !== mainnet.id) {
    throw new Error('Mint RUSD from USDC is only supported on Mainnet');
  }

  return {
    tokenOutMinAmount: rusdAmountOutMinAmount,
    zapCalls: [
      {
        target: USDC_ADDRESS[chainId],
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [PEG_STABILITY_MODULE[chainId], usdcAmount],
        }),
        nativeTokenAmount: 0n,
      },
      {
        target: zapInAllowanceContractAddress,
        data: encodeFunctionData({
          abi: zapInAllowanceAbi,
          functionName: 'transferApprovedAssets',
          args: [USDC_ADDRESS[chainId], usdcAmount],
        }),
        nativeTokenAmount: 0n,
      },
      {
        target: CREDIT_ENFORCER[chainId],
        data: encodeFunctionData({
          abi: creditEnforcerAbi,
          functionName: 'mintStablecoin',
          args: [usdcAmount],
        }),
        nativeTokenAmount: 0n,
      },
      {
        target: RUSD_ADDRESS[chainId],
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          /**
           * We assume that USDC:RUSD is 1:1, so we approve the amount of USDC
           * that we want to deposit.
           */
          args: [plasmaVaultAddress, to18(usdcAmount, USDC_DECIMALS)],
        }),
        nativeTokenAmount: 0n,
      },
    ],
    assetsToRefundToSender: [],
    nativeTokenAmount: 0n,
  };
};

export const mintRusdFromUsdc = {
  tokenIn: USDC_ADDRESS[mainnet.id],
  tokenOut: RUSD_ADDRESS[mainnet.id],
  id: 'mintRusdFromUsdc',
  label: 'Mint RUSD',
  zap,
} as const satisfies ZapConfig;
