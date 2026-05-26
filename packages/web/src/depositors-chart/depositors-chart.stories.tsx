import { withAppProviders } from '@/app/app-providers-decorator';
import { DepositorsChart, DepositorsChartContent } from './depositors-chart';
import { DepositorsChartContext } from './depositors-chart.context';
import type { DepositorsChartParams } from './depositors-chart.params';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { depositorsMock } from '@/depositors-chart/__mocks__/depositors.mock';
import { metricsMock } from '@/depositors-chart/__mocks__/metrics.mock';
import { satisifyType } from '@/lib/utils';

const withDepositorsChart: Decorator = (Story, context) => {
  return (
    <DepositorsChartContext.Provider
      value={{
        params: context.args?.params as DepositorsChartParams,
      }}
    >
      <Story />
    </DepositorsChartContext.Provider>
  );
};

const meta: Meta<typeof DepositorsChart> = {
  title: 'Features/DepositorsChart',
  component: DepositorsChartContent,
  decorators: [
    (Story) => (
      <div className="w-[30rem]">
        <Story />
      </div>
    ),
    withDepositorsChart,
    withAppProviders,
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Depositors chart showing distribution of depositor balances in vault TVL as a pie chart with total active depositors in the center.',
      },
    },
  },
  argTypes: {
    params: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultParams: DepositorsChartParams = {
  depositorsData: depositorsMock,
  metricsData: metricsMock,
  isLoading: false,
  isError: false,
};

export const Default: Story = {
  args: {
    params: satisifyType<DepositorsChartParams>({
      ...defaultParams,
    }),
  },
};

export const Loading: Story = {
  args: {
    params: satisifyType<DepositorsChartParams>({
      depositorsData: undefined,
      metricsData: undefined,
      isLoading: true,
      isError: false,
    }),
  },
};

export const Error: Story = {
  args: {
    params: satisifyType<DepositorsChartParams>({
      depositorsData: undefined,
      metricsData: undefined,
      isLoading: false,
      isError: true,
    }),
  },
};
