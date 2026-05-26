import { createContext, useContext } from 'react';
import { type DepositorsListParams } from './depositors-list.params';

interface ContextValue {
  params: DepositorsListParams;
}

export const DepositorsListContext = createContext<ContextValue | null>(null);

export const useDepositorsListContext = () => {
  const context = useContext(DepositorsListContext);

  if (!context) {
    throw new Error(
      'useDepositorsListContext must be used within DepositorsListContext.Provider',
    );
  }

  return context;
};
