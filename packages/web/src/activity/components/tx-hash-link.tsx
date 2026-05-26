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
import { getExplorerTxUrl } from '@/lib/get-explorer-tx-url';
import type { Address } from 'viem';

interface Props {
  txHash: Address;
  chainId: number;
}

export function TxHashLink({ txHash, chainId }: Props) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(false);
    }
  };

  const displayText = truncateHex(txHash, 4);
  const explorerUrl = getExplorerTxUrl(txHash, chainId);

  return (
    <TooltipProvider>
      <div className="inline-flex items-center gap-1">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1"
          title={`View transaction on block explorer`}
        >
          <span className="font-mono text-sm">{displayText}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        <Tooltip open={isCopied}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-5 w-5 cursor-pointer"
              title="Copy transaction hash"
            >
              <CopyIcon className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copied!</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
