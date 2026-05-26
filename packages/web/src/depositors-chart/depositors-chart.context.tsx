import { createContext, useContext } from 'react';
import type { DepositorsChartParams } from './depositors-chart.params';

interface ContextValue {
  params: DepositorsChartParams;
}

export const DepositorsChartContext = createContext<ContextValue | undefined>(
  undefined,
);

export const useDepositorsChartContext = () => {
  const context = useContext(DepositorsChartContext);
  if (!context) {
    throw new Error(
      'useDepositorsChartContext must be used within a DepositorsChartContext.Provider',
    );
  }
  return context;
};
