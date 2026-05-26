import type { Meta, StoryObj } from '@storybook/react';
import { WalletDecorator } from '@/app/wallet.decorator';
import CreateTreasuryVaultPage from './page';

const meta: Meta<typeof CreateTreasuryVaultPage> = {
  title: 'YO Treasury / Create Treasury Vault',
  component: CreateTreasuryVaultPage,
  decorators: [WalletDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CreateTreasuryVaultPage>;

export const Default: Story = {};
