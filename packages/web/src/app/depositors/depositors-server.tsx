'use client';

import { AppProviders } from '@/app/app-providers';
import { DepositorsContent } from '@/depositors/depositors-content';
import type {
  DepositorsResponse,
  DepositorSearchParams,
} from '@/depositors/fetch-depositors';

interface Props {
  initialData: DepositorsResponse;
  searchParams: DepositorSearchParams;
}

export function DepositorsServer({ initialData, searchParams }: Props) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Depositors
            </h1>
            <p className="text-muted-foreground">
              Explore depositors across vaults
            </p>
          </div>

          {/* Content */}
          <DepositorsContent
            depositors={initialData.depositors}
            pagination={initialData.pagination}
            searchParams={searchParams}
          />
        </div>
      </div>
    </AppProviders>
  );
}
