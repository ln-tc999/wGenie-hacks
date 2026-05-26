import type { Decorator, Meta, StoryObj } from '@storybook/react';
import {
  DepositorsList,
  DepositorsListContent,
} from '@/depositors-list/depositors-list';
import { DepositorsListContext } from '@/depositors-list/depositors-list.context';
import type { DepositorsListParams } from '@/depositors-list/depositors-list.params';
import { withAppProviders } from '@/app/app-providers-decorator';
import { satisifyType } from '@/lib/utils';
import { depositorsMock } from '@/depositors-list/__mocks__/depositors.mock';
import { withVault } from '@/vault/vault-decorator';
import { base } from 'viem/chains';

const withDepositorsChart: Decorator = (Story, context) => {
  return (
    <DepositorsListContext.Provider
      value={{
        params: context.args?.params as DepositorsListParams,
      }}
    >
      <Story />
    </DepositorsListContext.Provider>
  );
};

const meta: Meta<typeof DepositorsList> = {
  title: 'Features/DepositorsList',
  component: DepositorsListContent,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story: any) => (
      <div className="max-w-4xl mx-auto">
        <Story />
      </div>
    ),
    withDepositorsChart,
    withVault,
    withAppProviders,
  ],
  args: {
    chainId: base.id,
    vaultAddress: '0x1234567890123456789012345678901234567890',
    assetDecimals: 6,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultParams = satisifyType<DepositorsListParams>({
  depositorsData: depositorsMock,
  currentPage: 1,
  isLoading: false,
  isError: false,
  paginationActions: {
    goToPage: () => {},
  },
});

export const Default: Story = {
  args: {
    params: defaultParams,
  },
};

export const Loading: Story = {
  args: {
    params: satisifyType<DepositorsListParams>({
      ...defaultParams,
      depositorsData: undefined,
      currentPage: 0,
      isLoading: true,
    }),
  },
};

export const Error: Story = {
  args: {
    params: satisifyType<DepositorsListParams>({
      ...defaultParams,
      depositorsData: undefined,
      currentPage: 0,
      isError: true,
    }),
  },
};

export const NoData: Story = {
  args: {
    params: satisifyType<DepositorsListParams>({
      ...defaultParams,
      depositorsData: {
        depositors: [],
        pagination: {
          currentPage: 1,
          totalPages: 23,
          totalCount: 442,
          hasNext: true,
          hasPrevious: false,
        },
      },
      currentPage: 1,
      isError: false,
    }),
  },
};
