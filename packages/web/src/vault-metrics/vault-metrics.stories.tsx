import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { VaultMetricsContent } from './vault-metrics';
import { withAppProviders } from '@/app/app-providers-decorator';
import { mainnet } from 'viem/chains';
import { withVault } from '@/vault/vault-decorator';
import { VaultMetricsContext } from '@/vault-metrics/vault-metrics.context';
import type { VaultMetricsParams } from '@/vault-metrics/vault-metrics.params';
import { satisifyType } from '@/lib/utils';

const withVaultMetrics: Decorator = (Story, context) => {
  return (
    <VaultMetricsContext.Provider
      value={{
        params: context.args?.params as VaultMetricsParams,
      }}
    >
      <Story />
    </VaultMetricsContext.Provider>
  );
};

const meta: Meta<typeof VaultMetricsContent> = {
  title: 'Features/VaultMetrics',
  component: VaultMetricsContent,
  decorators: [withVaultMetrics, withVault, withAppProviders],
  parameters: {
    layout: 'padded',
  },
  args: {
    chainId: mainnet.id,
    vaultAddress: '0x1234567890123456789012345678901234567890',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultParams = satisifyType<VaultMetricsParams>({
  isError: false,
  isLoading: false,
  tvl: 1000000n,
  metrics: {
    totalShareBalance: 1000000n,
    activeDepositors: 100,
    allTimeDepositors: 1000,
    firstDeposit: 1000,
  },
});

export const Default: Story = {
  args: {
    params: defaultParams,
  },
};

export const Loading: Story = {
  ...Default,
  args: {
    params: satisifyType<VaultMetricsParams>({
      ...defaultParams,
      isLoading: true,
    }),
  },
};

export const Error: Story = {
  ...Default,
  args: {
    params: satisifyType<VaultMetricsParams>({
      ...defaultParams,
      isError: true,
    }),
  },
};
