import { DepositorsListItemContext } from './depositors-list-item.context';
import { DepositorsListItemContent } from './components/depositors-list-item-content';
import { useDepositorsListItemParams } from './depositors-list-item.params';
import type { Depositor } from '@/depositors-list/queries/use-depositors-query';

interface Props {
  depositor: Depositor;
}

export const DepositorsListItem = ({ depositor }: Props) => {
  const params = useDepositorsListItemParams({ depositor });

  return (
    <DepositorsListItemContext.Provider
      value={{
        params,
      }}
    >
      <DepositorsListItemContent />
    </DepositorsListItemContext.Provider>
  );
};
