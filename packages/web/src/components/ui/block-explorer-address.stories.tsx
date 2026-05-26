import type { Meta, StoryObj } from '@storybook/react';

import { BlockExplorerAddress } from '@/components/ui/block-explorer-address';
import { ALLOWED_CHAIN_IDS } from '@/app/wagmi-provider';
import { arbitrum, base, mainnet } from 'viem/chains';

const meta = {
  title: 'Components/BlockExplorerAddress',
  component: BlockExplorerAddress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    address: {
      control: 'text',
      description: 'The Ethereum address to display',
    },
    chainId: {
      control: 'select',
      options: ALLOWED_CHAIN_IDS,
      description: 'The blockchain network ID',
    },
    visibleDigits: {
      control: { type: 'number', min: 2, max: 10 },
      description: 'Number of visible digits when truncating address',
    },
    label: {
      control: 'text',
      description: 'Custom label to display instead of truncated address',
    },
  },
  args: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: 1,
    visibleDigits: 4,
  },
} satisfies Meta<typeof BlockExplorerAddress>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story with standard configuration
export const Default: Story = {
  args: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: mainnet.id,
  },
};

// Story with custom visible digits
export const CustomVisibleDigits: Story = {
  args: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: mainnet.id,
    visibleDigits: 6,
  },
};

// Story with custom label
export const WithCustomLabel: Story = {
  args: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: mainnet.id,
    label: 'Vault Contract',
  },
};

// Story with Arbitrum chain
export const ArbitrumChain: Story = {
  args: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: arbitrum.id,
    label: 'Arbitrum Vault',
  },
};

// Story with Base chain
export const BaseChain: Story = {
  args: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: base.id,
    label: 'Base Vault',
  },
};

// Story with different address
export const DifferentAddress: Story = {
  args: {
    address: '0x1234567890123456789012345678901234567890',
    chainId: mainnet.id,
    label: 'Different Address',
  },
};

// Story showing multiple instances (for hover highlighting demo)
export const MultipleInstances: Story = {
  render: () => (
    <div className="flex gap-2">
      <BlockExplorerAddress
        address="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        chainId={mainnet.id}
      />
      <BlockExplorerAddress
        address="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        label="Same Address"
        chainId={mainnet.id}
      />
      <BlockExplorerAddress
        address="0x1234567890123456789012345678901234567890"
        label="Different Address"
        chainId={mainnet.id}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Hover over any address to highlight all instances of the same address across the component.',
      },
    },
  },
};
