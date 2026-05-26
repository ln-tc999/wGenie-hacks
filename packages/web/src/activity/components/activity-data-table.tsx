'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity } from 'lucide-react';
import type { ActivityItem } from '../fetch-activity';
import { createActivityColumns } from './activity-columns';

interface Props {
  activities: ActivityItem[];
}

export function ActivityDataTable({ activities }: Props) {
  const columns = createActivityColumns();

  const table = useReactTable({
    data: activities,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 rounded-md border">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No activity found
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
      <Table className="min-w-[900px]">
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
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
