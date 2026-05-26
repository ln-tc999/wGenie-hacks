'use client';

import { VaultDataTable } from './components/vault-data-table';
import { VaultFilterBar } from './components/vault-filter-bar';
import { VaultFilterPopover } from './components/vault-filter-popover';
import { VaultPagination } from './components/vault-pagination';
import { SortSelect } from './components/sort-select';
import type {
  VaultData,
  VaultsMetadata,
  VaultSearchParams,
} from './fetch-vaults';

interface Props {
  vaults: VaultData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  metadata: VaultsMetadata;
  searchParams: VaultSearchParams;
}

export function VaultDirectoryContent({
  vaults,
  pagination,
  metadata,
  searchParams,
}: Props) {
  const currentSort = searchParams.sort || 'tvl';
  const currentPage = Number(searchParams.page) || 1;

  // Count active "More filters" (TVL Range + Depositor Count only)
  const moreFilterCount = [
    searchParams.tvl_min || searchParams.tvl_max,
    searchParams.depositors_min || searchParams.depositors_max,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Visible Filters */}
      <VaultFilterBar metadata={metadata} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <VaultFilterPopover
            metadata={metadata}
            activeFilterCount={moreFilterCount}
          />
          <span className="text-sm text-muted-foreground">
            {pagination.totalCount.toLocaleString()}{' '}
            {pagination.totalCount === 1 ? 'vault' : 'vaults'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <SortSelect value={currentSort} />
        </div>
      </div>

      {/* Table */}
      <VaultDataTable vaults={vaults} currentSort={currentSort} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <VaultPagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </div>
  );
}
