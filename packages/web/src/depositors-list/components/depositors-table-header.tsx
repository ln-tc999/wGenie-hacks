import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const DepositorsTableHeader = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Address</TableHead>
        <TableHead className="text-right">Asset Balance</TableHead>
        <TableHead className="text-right">API Share Balance</TableHead>
        <TableHead className="text-right">On-chain Share Balance</TableHead>
        <TableHead className="text-right">First Activity</TableHead>
        <TableHead className="text-right">Last Activity</TableHead>
      </TableRow>
    </TableHeader>
  );
};
