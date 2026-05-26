import * as React from 'react';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { truncateHex } from '@/lib/truncate-hex';
import { cn } from '@/lib/utils';
import { getExplorerAddressUrl } from '@/lib/get-explorer-address-url';
import type { ChainId } from '@/app/wagmi-provider';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  address: Address;
  visibleDigits?: number;
  label?: string;
}

// Global state to track highlighted addresses
const highlightedAddresses = new Set<Address>();

export const BlockExplorerAddress = ({
  address,
  visibleDigits = 4,
  label,
  chainId,
}: Props) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const [isHighlighted, setIsHighlighted] = React.useState(false);

  // Copy address to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Silently handle clipboard errors
      setIsCopied(false);
    }
  };

  // Handle hover to highlight same addresses
  const handleMouseEnter = () => {
    highlightedAddresses.add(address);
    setIsHighlighted(true);
  };

  const handleMouseLeave = () => {
    highlightedAddresses.delete(address);
    setIsHighlighted(false);
    setIsCopied(false);
  };

  // Check if this address should be highlighted
  React.useEffect(() => {
    const checkHighlight = () => {
      setIsHighlighted(highlightedAddresses.has(address));
    };

    // Check on mount and set up interval
    checkHighlight();
    const interval = setInterval(checkHighlight, 100);

    return () => clearInterval(interval);
  }, [address]);

  const displayText = label || truncateHex(address, visibleDigits);
  const explorerUrl = getExplorerAddressUrl(address, chainId);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded border border-transparent',
          isHighlighted &&
            'bg-accent/50 border-accent transition-colors ring-2 ring-yellow-400',
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Address Link */}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
          title={`View ${address} on block explorer`}
        >
          <span className="font-mono">{displayText}</span>
        </a>

        {/* Copy Button */}
        <Tooltip open={isCopied}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-4 w-4 cursor-pointer"
              title="Copy address"
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Address copied!</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
