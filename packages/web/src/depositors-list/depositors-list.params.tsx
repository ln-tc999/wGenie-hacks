import { useState } from 'react';
import { useDepositorsQuery } from '@/depositors-list/queries/use-depositors-query';

const ITEMS_PER_PAGE = 20;

export const useDepositorsListParams = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: depositorsData,
    isLoading,
    isError,
  } = useDepositorsQuery({
    params: {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    },
  });

  const totalPages = depositorsData?.pagination.totalPages ?? 0;

  const paginationActions = {
    goToPage: (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
  };

  return {
    depositorsData,
    currentPage,
    isLoading,
    isError,
    paginationActions,
  };
};

export type DepositorsListParams = ReturnType<typeof useDepositorsListParams>;
