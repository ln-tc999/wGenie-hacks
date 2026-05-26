import { createContext, useContext } from 'react';
import type { FlowChartParams } from '@/flow-chart/flow-chart.params';

interface ContextValue {
  params: FlowChartParams;
}

export const FlowChartContext = createContext<ContextValue | undefined>(
  undefined,
);

export const useFlowChartContext = () => {
  const context = useContext(FlowChartContext);
  if (context === undefined) {
    throw new Error(
      'useFlowChartContext must be used within a FlowChartContext.Provider',
    );
  }
  return context;
};
