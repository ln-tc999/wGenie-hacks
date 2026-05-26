'use client';

import { DepositorsDataTable } from './components/depositors-data-table';
import { DepositorsFilterBar } from './components/depositors-filter-bar';
import { DepositorsPagination } from './components/depositors-pagination';
import { DepositorsSortSelect } from './components/depositors-sort-select';
import type { DepositorItem, DepositorSearchParams } from './fetch-depositors';

interface Props {
  depositors: DepositorItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  searchParams: DepositorSearchParams;
}

export function DepositorsContent({
  depositors,
  pagination,
  searchParams,
}: Props) {
  const currentSort = searchParams.sort || 'balance';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <DepositorsFilterBar searchParams={searchParams} />
          <span className="text-sm text-muted-foreground">
            {pagination.totalCount.toLocaleString()}{' '}
            {pagination.totalCount === 1 ? 'depositor' : 'depositors'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <DepositorsSortSelect value={currentSort} />
        </div>
      </div>

      {/* Table */}
      <DepositorsDataTable depositors={depositors} currentSort={currentSort} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <DepositorsPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
}
