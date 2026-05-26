'use client';

import * as React from 'react';
import { CopyIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { truncateHex } from '@/lib/truncate-hex';
import { getDebankProfileUrl } from '@/lib/get-debank-profile-url';
import type { Address } from 'viem';

// DeBank icon SVG
function DebankIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="DeBank"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-13h4v2h-4V7zm0 4h4v6h-4v-6z" />
    </svg>
  );
}

interface Props {
  address: Address;
  chainId: number;
  ensName?: string;
}

export function DepositorAddress({ address, chainId, ensName }: Props) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  };

  const displayText = ensName || truncateHex(address, 4);
  const debankUrl = getDebankProfileUrl(address);

  // Get block explorer URL - need to handle different chains
  const getExplorerUrl = () => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
      130: 'https://uniscan.xyz',
      43114: 'https://snowtrace.io',
      19011: 'https://explorer.plasma.network',
    };
    const baseUrl = explorers[chainId] || 'https://etherscan.io';
    return `${baseUrl}/address/${address}`;
  };

  return (
    <TooltipProvider>
      <div className="inline-flex items-center gap-1">
        <a
          href={getExplorerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
          title={`View ${address} on block explorer`}
        >
          <span className="font-mono text-sm">{displayText}</span>
        </a>
        <Tooltip open={isCopied}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-5 w-5 cursor-pointer"
              title="Copy address"
            >
              <CopyIcon className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copied!</p>
          </TooltipContent>
        </Tooltip>
        <a
          href={debankUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="View on DeBank"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </TooltipProvider>
  );
}
