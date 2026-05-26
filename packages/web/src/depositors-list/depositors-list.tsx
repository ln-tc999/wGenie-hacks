'use client';

import {
  DepositorsListContext,
  useDepositorsListContext,
} from './depositors-list.context';
import { DepositorsTable } from './components/depositors-table';
import { DepositorsTableSkeleton } from './components/depositors-table-skeleton';
import { DepositorsError } from './components/depositors-error';
import { useDepositorsListParams } from '@/depositors-list/depositors-list.params';

export const DepositorsList = () => {
  const params = useDepositorsListParams();

  return (
    <DepositorsListContext.Provider
      value={{
        params,
      }}
    >
      <DepositorsListContent />
    </DepositorsListContext.Provider>
  );
};

export const DepositorsListContent = () => {
  const {
    params: { isLoading, isError },
  } = useDepositorsListContext();

  if (isLoading) {
    return <DepositorsTableSkeleton />;
  }

  if (isError) {
    return <DepositorsError />;
  }

  return <DepositorsTable />;
};
