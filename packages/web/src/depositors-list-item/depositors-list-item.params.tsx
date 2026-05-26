import { useReadContract } from 'wagmi';
import { erc20Abi, erc4626Abi } from 'viem';
import { useVaultContext } from '@/vault/vault.context';
import type { Depositor } from '@/depositors-list/queries/use-depositors-query';

interface Args {
  depositor: Depositor;
}

export const useDepositorsListItemParams = ({ depositor }: Args) => {
  const {
    chainId,
    vaultAddress,
    decimals: shareDecimals,
    assetDecimals,
    assetSymbol,
  } = useVaultContext();
  const { address, shareBalance, firstActivity, lastActivity } = depositor;

  const { data: onchainShareBalance } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: assetBalance } = useReadContract({
    chainId,
    address: vaultAddress,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: [shareBalance],
  });

  return {
    address,
    chainId,
    shareBalance,
    shareDecimals,
    onchainShareBalance,
    assetBalance,
    assetDecimals,
    assetSymbol,
    firstActivity,
    lastActivity,
  };
};

export type DepositorsListItemParams = ReturnType<
  typeof useDepositorsListItemParams
>;
