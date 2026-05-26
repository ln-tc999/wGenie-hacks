import type {
  VaultFilters,
  NetFlowOption,
  SortOption,
} from '@/vault-directory/vault-directory.types';

// VaultAPIParams type definition (previously from use-vaults-query)
export interface VaultAPIParams {
  page: number;
  limit: number;
  sort: 'tvl' | 'depositors' | 'age';
  tvl_min?: number;
  tvl_max?: number;
  depositors_min?: number;
  depositors_max?: number;
  net_flow?: 'positive' | 'negative';
  underlying_assets?: string;
  chains?: string;
  protocols?: string;
}

// Default filter values
export const DEFAULT_FILTERS: VaultFilters = {
  tvlRange: null,
  depositorRange: null,
  netFlow: 'all',
  underlyingAssets: [],
  chains: [],
  protocols: [],
};

// Constants
export const ITEMS_PER_PAGE = 20;
export const MAX_TVL_VALUE = 1000000000; // 1 billion USD
export const MIN_TVL_VALUE = 0;

// URL parameter utilities
export const updateURLParams = (params: {
  filters: VaultFilters;
  sortBy: SortOption;
  currentPage: number;
}) => {
  const url = new URL(window.location.href);
  const { filters, sortBy, currentPage } = params;

  // Clear existing parameters
  url.searchParams.delete('page');
  url.searchParams.delete('sort');
  url.searchParams.delete('tvl_min');
  url.searchParams.delete('tvl_max');
  url.searchParams.delete('depositors');
  url.searchParams.delete('net_flow');
  url.searchParams.delete('assets');
  url.searchParams.delete('chains');
  url.searchParams.delete('protocols');

  // Set new parameters
  if (currentPage > 1) {
    url.searchParams.set('page', currentPage.toString());
  }

  if (sortBy !== 'tvl') {
    url.searchParams.set('sort', sortBy);
  }

  if (filters.tvlRange) {
    url.searchParams.set('tvl_min', filters.tvlRange.min.toString());
    url.searchParams.set('tvl_max', filters.tvlRange.max.toString());
  }

  if (filters.depositorRange) {
    url.searchParams.set('depositors', filters.depositorRange.label);
  }

  if (filters.netFlow !== 'all') {
    url.searchParams.set('net_flow', filters.netFlow);
  }

  if (filters.underlyingAssets?.length > 0) {
    url.searchParams.set('assets', filters.underlyingAssets.join(','));
  }

  if (filters.chains?.length > 0) {
    url.searchParams.set('chains', filters.chains.join(','));
  }

  if (filters.protocols?.length > 0) {
    url.searchParams.set('protocols', filters.protocols.join(','));
  }

  window.history.replaceState({}, '', url.toString());
};

export const parseURLParams = (): {
  filters: VaultFilters;
  sortBy: SortOption;
  currentPage: number;
} => {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  const filters: VaultFilters = {
    tvlRange: null,
    depositorRange: null,
    netFlow: (params.get('net_flow') as NetFlowOption) || 'all',
    underlyingAssets: params.get('assets')?.split(',').filter(Boolean) || [],
    chains:
      params
        .get('chains')
        ?.split(',')
        .map(Number)
        .filter((n) => !isNaN(n)) || [],
    protocols: params.get('protocols')?.split(',').filter(Boolean) || [],
  };

  // Parse TVL range
  const tvlMin = params.get('tvl_min');
  const tvlMax = params.get('tvl_max');
  if (tvlMin && tvlMax) {
    const min = parseFloat(tvlMin);
    const max = parseFloat(tvlMax);
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      filters.tvlRange = { min, max };
    }
  }

  // Parse depositor range
  const depositorLabel = params.get('depositors');
  if (depositorLabel) {
    const depositorRange = DEPOSITOR_RANGES.find(
      (range) => range.label === depositorLabel,
    );
    if (depositorRange) {
      filters.depositorRange = depositorRange;
    }
  }

  const sortBy = (params.get('sort') as SortOption) || 'tvl';
  const currentPage = Math.max(1, parseInt(params.get('page') || '1', 10));

  return { filters, sortBy, currentPage };
};

// LocalStorage utilities
const STORAGE_KEY = 'vaultDirectoryFilters';

export const saveFiltersToLocalStorage = (filters: VaultFilters) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error);
  }
};

export const loadFiltersFromLocalStorage = (): VaultFilters | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as VaultFilters;
    }
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error);
  }
  return null;
};

// Depositor range options
export const DEPOSITOR_RANGES = [
  { min: 1, max: 10, label: '1-10' },
  { min: 11, max: 50, label: '11-50' },
  { min: 51, max: 100, label: '51-100' },
  { min: 101, max: 500, label: '101-500' },
  { min: 501, max: Infinity, label: '500+' },
];

// API parameter conversion
export const convertFiltersToAPIParams = (
  filters: VaultFilters,
  sortBy: SortOption,
  currentPage: number,
): VaultAPIParams => {
  const params: VaultAPIParams = {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    sort: sortBy,
  };

  if (filters.tvlRange) {
    params.tvl_min = filters.tvlRange.min;
    params.tvl_max = filters.tvlRange.max;
  }

  if (filters.depositorRange) {
    params.depositors_min = filters.depositorRange.min;
    params.depositors_max =
      filters.depositorRange.max === Infinity
        ? undefined
        : filters.depositorRange.max;
  }

  if (filters.netFlow !== 'all') {
    params.net_flow = filters.netFlow;
  }

  if (filters.underlyingAssets?.length > 0) {
    params.underlying_assets = filters.underlyingAssets.join(',');
  }

  if (filters.chains?.length > 0) {
    params.chains = filters.chains.join(',');
  }

  if (filters.protocols?.length > 0) {
    params.protocols = filters.protocols.join(',');
  }

  return params;
};

// Logarithmic scale utilities
// Converts a value to a slider position (0-100) using log scale
export const valueToLogSlider = (
  value: number,
  min: number,
  max: number,
): number => {
  if (value <= min) return 0;
  if (value >= max) return 100;

  // Use log10 for the conversion
  // Add 1 to avoid log(0) issues
  const minLog = Math.log10(min + 1);
  const maxLog = Math.log10(max + 1);
  const valueLog = Math.log10(value + 1);

  return ((valueLog - minLog) / (maxLog - minLog)) * 100;
};

// Converts a slider position (0-100) back to a value using log scale
export const logSliderToValue = (
  slider: number,
  min: number,
  max: number,
): number => {
  if (slider <= 0) return min;
  if (slider >= 100) return max;

  const minLog = Math.log10(min + 1);
  const maxLog = Math.log10(max + 1);

  const valueLog = minLog + (slider / 100) * (maxLog - minLog);
  return Math.pow(10, valueLog) - 1;
};

// Format large numbers for display (e.g., $1.5M, $250K)
export const formatCompactNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

export const formatCompactCount = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

// Filter validation utilities
export const validateTVLRange = (
  range: { min: number; max: number },
  maxTvl: number = MAX_TVL_VALUE,
): boolean => {
  return (
    range.min >= MIN_TVL_VALUE && range.max <= maxTvl && range.min <= range.max
  );
};

export const isFiltersActive = (filters: VaultFilters): boolean => {
  return (
    filters.tvlRange !== null ||
    filters.depositorRange !== null ||
    filters.netFlow !== 'all' ||
    (filters.underlyingAssets?.length ?? 0) > 0 ||
    (filters.chains?.length ?? 0) > 0 ||
    (filters.protocols?.length ?? 0) > 0
  );
};
