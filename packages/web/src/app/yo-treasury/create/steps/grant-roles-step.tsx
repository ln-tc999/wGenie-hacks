'use client';

import { useEffect } from 'react';
import type { Address } from 'viem';
import {
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { StepRow, type StepStatus } from '../components/step-row';
import {
  CHAIN_ID,
  ROLES_TO_GRANT,
  accessManagerAbi,
  plasmaVaultAbi,
} from '../vault-creation.constants';

interface Props {
  vaultAddress: Address;
  ownerAddress: Address;
  enabled: boolean;
}

export function GrantRolesStep({ vaultAddress, ownerAddress, enabled }: Props) {
  // Read access manager address from vault
  const { data: accessManagerResults } = useReadContracts({
    contracts: [
      {
        address: vaultAddress,
        abi: plasmaVaultAbi,
        functionName: 'getAccessManagerAddress',
        chainId: CHAIN_ID,
      },
    ],
    query: { enabled },
  });

  const accessManagerAddress = accessManagerResults?.[0]?.result as
    | Address
    | undefined;

  // Check which roles are already granted
  const { data: roleChecks, refetch: refetchRoles } = useReadContracts({
    contracts: ROLES_TO_GRANT.map((role) => ({
      address: accessManagerAddress!,
      abi: accessManagerAbi,
      functionName: 'hasRole' as const,
      args: [role.value, ownerAddress] as const,
      chainId: CHAIN_ID,
    })),
    query: { enabled: !!accessManagerAddress },
  });

  const rolesGranted =
    roleChecks?.map((r) => (r.result as [boolean, number] | undefined)?.[0] ?? false) ?? [];
  const allRolesGranted = rolesGranted.length === ROLES_TO_GRANT.length && rolesGranted.every(Boolean);

  // Find first missing role
  const firstMissingIndex = rolesGranted.findIndex((granted) => !granted);

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // After a role tx confirms, refetch and advance
  useEffect(() => {
    if (isConfirmed) {
      resetWrite();
      refetchRoles();
    }
  }, [isConfirmed, resetWrite, refetchRoles]);

  if (!enabled) {
    return <StepRow number={2} label="Grant Roles" status="pending" />;
  }

  if (allRolesGranted) {
    return (
      <StepRow
        number={2}
        label="Grant Roles"
        status="done"
        detail="4/4 roles granted"
      />
    );
  }

  const status: StepStatus =
    isWriting || isConfirming ? 'loading' : writeError ? 'error' : 'pending';

  const grantedCount = rolesGranted.filter(Boolean).length;
  const nextRole =
    firstMissingIndex >= 0 ? ROLES_TO_GRANT[firstMissingIndex] : undefined;

  const handleGrant = () => {
    if (!accessManagerAddress || !nextRole) return;
    writeContract({
      address: accessManagerAddress,
      abi: accessManagerAbi,
      functionName: 'grantRole',
      args: [nextRole.value, ownerAddress, 0],
      chainId: CHAIN_ID,
    });
  };

  return (
    <div className="space-y-2">
      <StepRow
        number={2}
        label="Grant Roles"
        status={status}
        detail={
          isWriting
            ? `Granting ${nextRole?.label}... (${grantedCount + 1}/${ROLES_TO_GRANT.length})`
            : isConfirming
              ? `Confirming ${nextRole?.label}...`
              : `${grantedCount}/${ROLES_TO_GRANT.length} roles granted`
        }
      />
      {status === 'pending' && (
        <Button
          onClick={handleGrant}
          disabled={!accessManagerAddress || !nextRole}
          size="sm"
          className="w-full"
        >
          Grant {nextRole?.label} Role ({grantedCount + 1}/
          {ROLES_TO_GRANT.length})
        </Button>
      )}
      {writeError && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            {writeError.message.slice(0, 200)}
          </p>
          <Button variant="ghost" size="sm" onClick={() => resetWrite()}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
