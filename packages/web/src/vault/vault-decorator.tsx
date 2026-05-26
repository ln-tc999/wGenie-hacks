import type { Decorator } from '@storybook/react';
import { VaultContext, type ContextValue } from '@/vault/vault.context';
import { pick } from 'remeda';

export const withVault: Decorator = (Story, context) => {
  const value = pick(context.args, [
    'chainId',
    'vaultAddress',
    'name',
    'symbol',
    'decimals',
    'asset',
    'assetDecimals',
    'assetSymbol',
  ]) as ContextValue;

  return (
    <VaultContext.Provider value={value}>
      <Story />
    </VaultContext.Provider>
  );
};
