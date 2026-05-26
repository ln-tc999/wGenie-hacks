import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  assert,
} from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockExplorerAddress } from './block-explorer-address';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

describe('BlockExplorerAddress', () => {
  const mockAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });

    // Mock window.open for external links
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('rendering', () => {
    it('should render truncated address by default', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      expect(screen.getByText('0x8335...2913')).toBeInTheDocument();
    });

    it('should render with custom visible digits', () => {
      render(
        <BlockExplorerAddress
          address={mockAddress}
          visibleDigits={6}
          chainId={1}
        />,
      );

      expect(screen.getByText('0x833589...A02913')).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(
        <BlockExplorerAddress
          address={mockAddress}
          label="Custom Label"
          chainId={1}
        />,
      );

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
      expect(screen.queryByText('0x8335...2913')).not.toBeInTheDocument();
    });

    it('should render copy button', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const copyButton = screen.getByRole('button', { name: /copy address/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should render external link icon', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      // External link icon should be present
      expect(screen.getByTitle(/view.*on block explorer/i)).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy address to clipboard when copy button is clicked', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const copyButton = screen.getByRole('button', { name: /copy address/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockAddress);
      });
    });

    it('should handle clipboard error gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const copyButton = screen.getByRole('button', { name: /copy address/i });
      fireEvent.click(copyButton);

      // Should not throw an error
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockAddress);
      });
    });
  });

  describe('block explorer links', () => {
    it('should generate correct Ethereum explorer URL', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        `https://etherscan.io/address/${mockAddress}`,
      );
    });

    it('should generate correct Base explorer URL', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={8453} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        `https://basescan.org/address/${mockAddress}`,
      );
    });

    it('should open link in new tab', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('hover highlighting', () => {
    it('should highlight component on hover', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const container = screen.getByText('0x8335...2913').closest('div');
      expect(container).toBeInTheDocument();
      assert(container);

      fireEvent.mouseEnter(container);

      // The component should have highlight classes applied
      expect(container).toHaveClass('bg-accent/50');
      expect(container).toHaveClass('border-accent');
    });

    it('should remove highlight on mouse leave', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const container = screen.getByText('0x8335...2913').closest('div');
      expect(container).toBeInTheDocument();
      assert(container);

      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);

      // The highlight should be removed
      expect(container).not.toHaveClass('bg-accent/50');
      expect(container).not.toHaveClass('border-accent');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const copyButton = screen.getByRole('button', { name: /copy address/i });
      expect(copyButton).toBeInTheDocument();

      const link = screen.getByTitle(/view.*on block explorer/i);
      expect(link).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<BlockExplorerAddress address={mockAddress} chainId={1} />);

      const copyButton = screen.getByRole('button', { name: /copy address/i });
      expect(copyButton).toBeInTheDocument();

      // Button should be focusable
      copyButton.focus();
      expect(document.activeElement).toBe(copyButton);
    });
  });
});
