import type { VaultData } from '@/vault-directory/fetch-vaults';

// Filter state management
export interface VaultFilters {
  tvlRange: TVLRange | null;
  depositorRange: DepositorRange | null;
  netFlow: NetFlowOption;
  underlyingAssets: string[]; // Symbols of selected underlying assets
  chains: number[]; // Chain IDs
  protocols: string[]; // Protocol names
}

export interface TVLRange {
  min: number;
  max: number;
}

export interface DepositorRange {
  min: number;
  max: number;
  label: string;
}

export type NetFlowOption = 'all' | 'positive' | 'negative';

export type SortOption = 'tvl' | 'depositors' | 'age';

// API request/response types
export interface VaultDirectoryRequest {
  page: number;
  limit: number;
  sort: SortOption;
  filters: VaultFilters;
}

// Component prop types
export interface VaultDirectoryState {
  vaults: VaultData[];
  loading: boolean;
  error: string | null;
  filters: VaultFilters;
  sortBy: SortOption;
  currentPage: number;
  totalPages: number;
  totalVaults: number;
}

export interface FilterActions {
  updateTVLRange: (range: TVLRange | null) => void;
  updateDepositorRange: (range: DepositorRange | null) => void;
  updateNetFlow: (option: NetFlowOption) => void;
  updateUnderlyingAssets: (assets: string[]) => void;
  updateChains: (chains: number[]) => void;
  updateProtocols: (protocols: string[]) => void;
  clearFilters: () => void;
}

export interface VaultAPIResponse {
  success: boolean;
  data: {
    vaults: VaultData[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
  error?: string;
}

export interface AssetOption {
  symbol: string;
  label: string;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
