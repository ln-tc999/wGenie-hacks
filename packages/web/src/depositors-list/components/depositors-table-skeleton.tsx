import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DepositorsTableHeader } from './depositors-table-header';

export const DepositorsTableSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <DepositorsTableHeader />
            <TableBody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
