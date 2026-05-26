import { Table, TableBody } from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDepositorsListContext } from '../depositors-list.context';
import { DepositorsTableHeader } from './depositors-table-header';
import { DepositorsListItem } from '@/depositors-list-item/depositors-list-item';
import { DepositorsListPagination } from './depositors-list-pagination';

export const DepositorsTable = () => {
  const {
    params: { depositorsData },
  } = useDepositorsListContext();

  if (!depositorsData || depositorsData.depositors.length === 0) {
    return <NoDepositors />;
  }

  const totalCount = depositorsData.pagination.totalCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Depositors</span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalCount} total depositors
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 border-t border-b">
        <Table>
          <DepositorsTableHeader />
          <TableBody>
            {depositorsData.depositors.map((depositor) => (
              <DepositorsListItem
                key={depositor.address}
                depositor={depositor}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <DepositorsListPagination />
      </CardFooter>
    </Card>
  );
};

const NoDepositors = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">No depositors found</p>
    </div>
  );
};
