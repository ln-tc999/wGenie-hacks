'use client';

import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createColumns } from './vault-columns';
import type { VaultData } from '@/vault-directory/fetch-vaults';
import Link from 'next/link';
import { Package } from 'lucide-react';

interface Props {
  vaults: VaultData[];
  currentSort: string;
}

export function VaultDataTable({ vaults, currentSort }: Props) {
  const columns = createColumns(currentSort);

  const table = useReactTable({
    data: vaults,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (vaults.length === 0) {
    return (
      <div className="text-center py-12 rounded-md border">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No vaults found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your filters to see more results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[800px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const vault = row.original;
            const href = `/vaults/${vault.chainId}/${vault.address}`;

            return (
              <TableRow key={row.id} className="group relative">
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell key={cell.id} className="relative">
                    {index === 0 && (
                      <Link
                        href={href}
                        className="absolute inset-0 z-10"
                        aria-label={`View ${vault.name} vault details`}
                      />
                    )}
                    <span className="relative">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
