import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { useVaultData, type VaultData } from './hooks/use-vault-data';
import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export interface ContextValue extends VaultData, Props {}

export const VaultContext = createContext<ContextValue | null>(null);

export const VaultProvider = ({
  children,
  ...props
}: PropsWithChildren<Props>) => {
  const vaultData = useVaultData(props);

  return (
    <VaultContext.Provider
      value={{
        ...vaultData,
        ...props,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVaultContext = () => {
  const context = useContext(VaultContext);

  if (!context) {
    throw new Error(
      'useVaultContext must be used within a VaultContext.Provider',
    );
  }

  return context;
};
