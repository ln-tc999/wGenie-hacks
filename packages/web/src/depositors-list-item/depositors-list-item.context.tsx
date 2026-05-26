import { createContext, useContext } from 'react';
import type { DepositorsListItemParams } from './depositors-list-item.params';

interface DepositorsListItemContextValue {
  params: DepositorsListItemParams;
}

export const DepositorsListItemContext =
  createContext<DepositorsListItemContextValue | null>(null);

export const useDepositorsListItemContext = () => {
  const context = useContext(DepositorsListItemContext);

  if (!context) {
    throw new Error(
      'useDepositorsListItemContext must be used within DepositorsListItemProvider',
    );
  }

  return context;
};
