import { describe, it, expect } from 'vitest';
import { mintRusdFromUsdc } from './mint-rusd-from-usdc';
import { decodeFunctionData, erc20Abi, parseUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { zapInAllowanceAbi } from '../../../abi/zap-in-allowance.abi';
import { creditEnforcerAbi } from '../abi/credit-enforcer.abi';

const RESERVOIR_SR_USD_LOOPING_ETHEREUM_ADDRESS =
  '0xe9385eff3f937fcb0f0085da9a3f53d6c2b4fb5f';
const USDC_ADDRESS_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

describe('mintRusdFromUsdc', () => {
  it('should return the correct zap input', () => {
    const zapInput = mintRusdFromUsdc.zap({
      chainId: mainnet.id,
      tokenInAmount: parseUnits('789', 6),
      tokenOutMinAmount: parseUnits('785.055', 18), // 0.5% slippage
      zapInAllowanceContractAddress: USDC_ADDRESS_ETHEREUM,
      plasmaVaultAddress: RESERVOIR_SR_USD_LOOPING_ETHEREUM_ADDRESS,
    });

    expect(zapInput).toEqual({
      assetsToRefundToSender: [],
      nativeTokenAmount: 0n,
      tokenOutMinAmount: 785055000000000000000n,
      zapCalls: [
        {
          data: '0x095ea7b30000000000000000000000004809010926aec940b550d34a46a52739f996d75d000000000000000000000000000000000000000000000000000000002f072f40',
          nativeTokenAmount: 0n,
          target: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
        {
          data: '0xf738a98c000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000002f072f40',
          nativeTokenAmount: 0n,
          target: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
        {
          data: '0xa0b4dbb1000000000000000000000000000000000000000000000000000000002f072f40',
          nativeTokenAmount: 0n,
          target: '0x04716DB62C085D9e08050fcF6F7D775A03d07720',
        },
        {
          data: '0x095ea7b3000000000000000000000000e9385eff3f937fcb0f0085da9a3f53d6c2b4fb5f00000000000000000000000000000000000000000000002ac59317b2e7340000',
          nativeTokenAmount: 0n,
          target: '0x09D4214C03D01F49544C0448DBE3A27f768F2b34',
        },
      ],
    });

    const approvePegStabilityModule = decodeFunctionData({
      abi: erc20Abi,
      data: zapInput.zapCalls[0]?.data!,
    });
    expect(approvePegStabilityModule).toEqual({
      args: ['0x4809010926aec940b550D34a46A52739f996D75D', 789000000n],
      functionName: 'approve',
    });

    const transferApprovedAssetsInput = decodeFunctionData({
      abi: zapInAllowanceAbi,
      data: zapInput.zapCalls[1]?.data!,
    });
    expect(transferApprovedAssetsInput).toEqual({
      args: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 789000000n],
      functionName: 'transferApprovedAssets',
    });

    const mintStablecoinInput = decodeFunctionData({
      abi: creditEnforcerAbi,
      data: zapInput.zapCalls[2]?.data!,
    });
    expect(mintStablecoinInput).toEqual({
      args: [789000000n],
      functionName: 'mintStablecoin',
    });

    const approveRusdInput = decodeFunctionData({
      abi: erc20Abi,
      data: zapInput.zapCalls[3]?.data!,
    });
    expect(approveRusdInput).toEqual({
      args: [
        '0xe9385eFf3F937FcB0f0085Da9A3F53D6C2B4fB5F',
        789000000000000000000n,
      ],
      functionName: 'approve',
    });
  });
});
