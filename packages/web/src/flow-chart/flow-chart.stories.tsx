import type { Meta, StoryObj, Decorator } from '@storybook/react';
import { FlowChart, FlowChartContent } from './flow-chart';
import { withAppProviders } from '@/app/app-providers-decorator';
import { withVault } from '@/vault/vault-decorator';
import { FlowChartContext } from '@/flow-chart/flow-chart.context';
import type { FlowChartParams } from '@/flow-chart/flow-chart.params';
import { mainnet } from 'viem/chains';
import { satisifyType } from '@/lib/utils';

import { flowChart7d } from '@/flow-chart/__mocks__/flow-chart-7d';
import { flowChart30d } from '@/flow-chart/__mocks__/flow-chart-30d';
import { flowChart90d } from '@/flow-chart/__mocks__/flow-chart-90d';
import { flowChart1y } from '@/flow-chart/__mocks__/flow-chart-1y';

const withFlowChart: Decorator = (Story, context) => {
  return (
    <FlowChartContext.Provider
      value={{
        params: context.args?.params as FlowChartParams,
      }}
    >
      <Story />
    </FlowChartContext.Provider>
  );
};

const meta = {
  title: 'Features/FlowChart',
  component: FlowChartContent,
  decorators: [
    (Story) => (
      <div className="w-[60rem]">
        <Story />
      </div>
    ),
    withFlowChart,
    withVault,
    withAppProviders,
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Flow Analysis chart showing inflow, outflow, and net flow over time with interactive time range picker.',
      },
    },
  },
  args: {
    chainId: mainnet.id,
    vaultAddress: '0x1234567890123456789012345678901234567890',
    assetDecimals: 6,
  },
} satisfies Meta<typeof FlowChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultParams = satisifyType<FlowChartParams>({
  data: undefined,
  timeRange: '7d',
  setTimeRange: () => {},
  isLoading: false,
  error: null,
});

export const SevenDays: Story = {
  name: '7 Days',
  args: {
    params: satisifyType<FlowChartParams>({
      ...defaultParams,
      data: flowChart7d,
      timeRange: '30d',
    }),
  },
};

export const ThirtyDays: Story = {
  name: '30 Days',
  args: {
    params: satisifyType<FlowChartParams>({
      ...defaultParams,
      data: flowChart30d,
      timeRange: '30d',
    }),
  },
};

export const NinetyDays: Story = {
  name: '90 Days',
  args: {
    params: satisifyType<FlowChartParams>({
      ...defaultParams,
      data: flowChart90d,
      timeRange: '90d',
    }),
  },
};

export const OneYear: Story = {
  name: '1 Year',
  args: {
    params: satisifyType<FlowChartParams>({
      ...defaultParams,
      data: flowChart1y,
      timeRange: '1y',
    }),
  },
};

export const Loading: Story = {
  name: 'Loading State',
  args: {
    params: satisifyType<FlowChartParams>({
      ...defaultParams,
      isLoading: true,
    }),
  },
};

const mockError = new globalThis.Error('Failed to load flow chart data');

export const Error: Story = {
  name: 'Error State',
  args: {
    params: satisifyType<FlowChartParams>({
      ...defaultParams,
      error: mockError,
    }),
  },
};

export const Default: Story = {
  args: {
    params: defaultParams,
  },
};
