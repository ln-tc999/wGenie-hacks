import type { Meta, StoryObj } from '@storybook/react';
import { DepositorsListItem } from './depositors-list-item';
import { AppProviders } from '@/app/app-providers';
import { VaultProvider } from '@/vault/vault.context';
import { Table, TableBody } from '@/components/ui/table';

const meta: Meta<typeof DepositorsListItem> = {
  title: 'Features/DepositorsListItem',
  component: DepositorsListItem,
  decorators: [
    (Story) => (
      <AppProviders>
        <VaultProvider
          chainId={1}
          vaultAddress="0x1234567890123456789012345678901234567890"
        >
          <div className="rounded-md border">
            <Table>
              <TableBody>
                <Story />
              </TableBody>
            </Table>
          </div>
        </VaultProvider>
      </AppProviders>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    depositor: {
      address: '0x1234567890123456789012345678901234567890',
      shareBalance: BigInt('1000000000000000000000'), // 1000 tokens
      firstActivity: 1640995200, // 2022-01-01
      lastActivity: 1704067200, // 2024-01-01
    },
  },
};

export const LargeBalance: Story = {
  args: {
    depositor: {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      shareBalance: BigInt('1000000000000000000000000'), // 1,000,000 tokens
      firstActivity: 1640995200, // 2022-01-01
      lastActivity: 1704067200, // 2024-01-01
    },
  },
};

export const RecentActivity: Story = {
  args: {
    depositor: {
      address: '0x9876543210987654321098765432109876543210',
      shareBalance: BigInt('500000000000000000000'), // 500 tokens
      firstActivity: 1704067200, // 2024-01-01
      lastActivity: Math.floor(Date.now() / 1000), // Current time
    },
  },
};
