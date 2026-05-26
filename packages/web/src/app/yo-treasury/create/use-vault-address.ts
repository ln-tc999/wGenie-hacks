'use client';

import { useState, useCallback } from 'react';
import type { Address } from 'viem';

const STORAGE_KEY = 'yo-treasury-vault-address';

function readFromStorage(): Address | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && /^0x[a-fA-F0-9]{40}$/.test(stored)) {
    return stored as Address;
  }
  return null;
}

export function useVaultAddress() {
  const [vaultAddress, setVaultAddressState] = useState<Address | null>(
    readFromStorage,
  );

  const setVaultAddress = useCallback((address: Address) => {
    localStorage.setItem(STORAGE_KEY, address);
    setVaultAddressState(address);
  }, []);

  const clearVaultAddress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setVaultAddressState(null);
  }, []);

  return [vaultAddress, setVaultAddress, clearVaultAddress] as const;
}
