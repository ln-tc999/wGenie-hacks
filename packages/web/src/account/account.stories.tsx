import type { Meta, StoryObj } from '@storybook/react';
import { Account } from './account';
import { mainnet } from 'viem/chains';
import { withAppProviders } from '@/app/app-providers-decorator';

const meta: Meta<typeof Account> = {
  title: 'Features/Account',
  component: Account,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    withAppProviders,
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890' as const,
    chainId: mainnet.id,
  },
  render: ({ address, chainId }) => (
    <Account address={address} chainId={chainId} />
  ),
};
