interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const TEN_MINUTES_MS = 10 * 60 * 1000;

export const getFromCache = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setInCache = <T>(
  key: string,
  data: T,
  ttlMs = TEN_MINUTES_MS,
): void => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

export const clearCache = (): void => {
  cache.clear();
};

export const getCacheKey = (chainId: number, vaultAddress: string): string => {
  return `vault:${chainId}:${vaultAddress.toLowerCase()}`;
};
