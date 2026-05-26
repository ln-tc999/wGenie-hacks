'use client';

import {
  DepositorsChartContext,
  useDepositorsChartContext,
} from './depositors-chart.context';
import { DepositorsChartDisplay } from './components/depositors-chart-display';
import { DepositorsChartSkeleton } from './components/depositors-chart-skeleton';
import { DepositorsChartError } from './components/depositors-chart-error';
import { useDepositorsChartParams } from './depositors-chart.params';

export const DepositorsChart = () => {
  const params = useDepositorsChartParams();

  return (
    <DepositorsChartContext.Provider
      value={{
        params,
      }}
    >
      <DepositorsChartContent />
    </DepositorsChartContext.Provider>
  );
};

export const DepositorsChartContent = () => {
  const {
    params: { isLoading, isError },
  } = useDepositorsChartContext();

  if (isLoading) {
    return <DepositorsChartSkeleton />;
  }

  if (isError) {
    return <DepositorsChartError />;
  }

  return <DepositorsChartDisplay />;
};
