import type { Meta, StoryObj } from '@storybook/react';
import { WalletDecorator } from '@/app/wallet.decorator';
import { WithdrawForm } from '@/vault-actions/components/withdraw-form';

const meta: Meta<typeof WithdrawForm> = {
  title: 'YO Treasury / Withdraw Form',
  component: WithdrawForm,
  decorators: [WalletDecorator],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof WithdrawForm>;

export const Base: Story = {
  args: {
    chainId: 8453,
    vaultAddress: '0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D',
  },
};
