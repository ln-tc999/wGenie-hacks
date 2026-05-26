import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useVaultContext } from '@/vault/vault.context';
import { addressSchema } from '@/lib/schema';
import { keepPreviousData } from '@tanstack/react-query';

const depositorSchema = z.object({
  address: addressSchema,
  shareBalance: z.coerce.bigint(),
  firstActivity: z.number(),
  lastActivity: z.number(),
});

export type Depositor = z.infer<typeof depositorSchema>;

export const depositorsResponseSchema = z.object({
  depositors: z.array(depositorSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export interface DepositorsAPIParams {
  page: number;
  limit: number;
}

const fetchDepositors = async (
  chainId: number,
  vaultAddress: string,
  params: DepositorsAPIParams,
) => {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  });
  const response = await fetch(
    `/api/vaults/${chainId}/${vaultAddress}/depositors?${searchParams.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch depositors: ${response.statusText}`);
  }
  const data = await response.json();
  return depositorsResponseSchema.parse(data);
};

export const useDepositorsQuery = ({
  params,
  enabled = true,
}: {
  params: DepositorsAPIParams;
  enabled?: boolean;
}) => {
  const { chainId, vaultAddress } = useVaultContext();

  return useQuery({
    queryKey: ['depositors', chainId, vaultAddress, params.page, params.limit],
    queryFn: () => fetchDepositors(chainId, vaultAddress, params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData,
  });
};
