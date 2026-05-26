import { describe, it, expect } from 'vitest';
import { decodeFunctionData, erc20Abi, parseEther } from 'viem';
import { tac } from 'viem/chains';
import { wrapTac } from './wrap-tac';
import { ANVIL_TEST_ACCOUNT } from '../../../lib/test-accounts';
import { wtacAbi } from '../abi/wtac.abi';

const GRAVITY_G_FORCE_VAULT_ADDRESS =
  '0x754bed7C83FB9bc172df86e606be7baC8bD69357';

describe('wrapTac', () => {
  it('should return the correct zap input', () => {
    const zapInput = wrapTac.zap({
      chainId: tac.id,
      tokenInAmount: parseEther('1'),
      // 0.5% slippage
      tokenOutMinAmount: parseEther('0.995'),
      // no approval needed for native token
      zapInAllowanceContractAddress: ANVIL_TEST_ACCOUNT[0].address,
      plasmaVaultAddress: GRAVITY_G_FORCE_VAULT_ADDRESS,
    });

    expect(zapInput).toEqual({
      assetsToRefundToSender: [],
      nativeTokenAmount: 1000000000000000000n,
      tokenOutMinAmount: 995000000000000000n,
      zapCalls: [
        {
          data: '0xd0e30db0',
          nativeTokenAmount: 1000000000000000000n,
          target: '0xB63B9f0eb4A6E6f191529D71d4D88cc8900Df2C9',
        },
        {
          data: '0x095ea7b3000000000000000000000000754bed7c83fb9bc172df86e606be7bac8bd693570000000000000000000000000000000000000000000000000de0b6b3a7640000',
          nativeTokenAmount: 0n,
          target: '0xB63B9f0eb4A6E6f191529D71d4D88cc8900Df2C9',
        },
      ],
    });

    expect(zapInput.zapCalls).toHaveLength(2);

    const depositToWTac = decodeFunctionData({
      abi: wtacAbi,
      data: zapInput.zapCalls[0]?.data!,
    });
    expect(depositToWTac).toEqual({
      functionName: 'deposit',
    });

    const approveWTacForVault = decodeFunctionData({
      abi: erc20Abi,
      data: zapInput.zapCalls[1]?.data!,
    });
    expect(approveWTacForVault).toEqual({
      args: [
        '0x754bed7C83FB9bc172df86e606be7baC8bD69357',
        1000000000000000000n,
      ],
      functionName: 'approve',
    });

    expect(zapInput.zapCalls[2]).toBeUndefined();
  });
});
