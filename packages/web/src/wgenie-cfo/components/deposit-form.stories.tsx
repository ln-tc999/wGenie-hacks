import type { Meta, StoryObj } from '@storybook/react';
import { WalletDecorator } from '@/app/wallet.decorator';
import { YoDepositForm } from '@/vault-actions/components/deposit-form';

const meta: Meta<typeof YoDepositForm> = {
  title: 'WalletGenie Treasury / Deposit Form',
  component: YoDepositForm,
  decorators: [WalletDecorator],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof YoDepositForm>;

export const Base: Story = {
  args: {
    chainId: 8453,
    vaultAddress: '0x09d1C2E03F73853916Ee86b4e1A729F9FbAA960D',
  },
};
