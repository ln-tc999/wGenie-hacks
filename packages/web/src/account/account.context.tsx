import { createContext, useContext } from 'react';
import { type AccountParams } from './account.params';

interface ContextValue {
  params: AccountParams;
}

export const AccountContext = createContext<ContextValue | undefined>(
  undefined,
);

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccountContext must be used within AccountProvider');
  }
  return context;
};
