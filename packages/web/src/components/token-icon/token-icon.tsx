'use client';

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { type Address, erc20Abi } from 'viem';
import { useReadContract } from 'wagmi';

const ASSETS_API_URL = 'https://assets.mainnet.wGenie.io';
const CREATE_ICON_API_URL = 'https://api-assets.mainnet.wGenie.io';
const CREATE_ICON_API_KEY = 'VmnFCf1qiS254TLZmxFcY6g5Y7gy0mL112zYrY7v';

interface TokenPathProps {
  chainId: number;
  address: Address;
}

const getTokenPath = ({ chainId, address }: TokenPathProps) => {
  return `images/icons/tokens/${chainId}/${address.toLowerCase()}.png`;
};

const fetchIcon = async (baseUrl: string, path: string, headers?: Record<string, string>) => {
  const response = await fetch(`${baseUrl}/${path}`, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
};

interface Props {
  chainId: number;
  address: Address | undefined;
  className?: string;
  showTitle?: boolean;
}

export const TokenIcon = ({ address, ...props }: Props) => {
  if (address === undefined) return <TokenIconPlaceholder {...props} />;
  return <TokenIconContent {...props} address={address} />;
};

type ContentProps = Props & TokenPathProps;

const TokenIconContent = (props: ContentProps) => {
  const { chainId, address } = props;
  const result = useTokenIcon({ chainId, address });

  if (result.isError) return <TokenIconCreator {...props} />;
  if (result.data) return <TokenIconDisplay {...props} />;
  return <TokenIconPlaceholder {...props} />;
};

const useTokenIcon = ({
  chainId,
  address,
  retry = false,
}: TokenPathProps & {
  retry?: boolean;
}) => {
  return useQuery({
    queryKey: ['useTokenIcon', chainId, address],
    queryFn: () => fetchIcon(ASSETS_API_URL, getTokenPath({ chainId, address })),
    retry,
  });
};

const useCreateTokenIcon = ({ chainId, address }: TokenPathProps) => {
  return useQuery({
    queryKey: ['useCreateTokenIcon', chainId, address],
    queryFn: () =>
      fetchIcon(CREATE_ICON_API_URL, getTokenPath({ chainId, address }), {
        'X-API-Key': CREATE_ICON_API_KEY,
      }),
  });
};

const useSymbol = (args: {
  address: Address | undefined;
  chainId: number;
}) => {
  const { data: symbol } = useReadContract({
    ...args,
    abi: erc20Abi,
    functionName: 'symbol',
  });
  return symbol;
};

const TokenIconDisplay = (props: ContentProps) => {
  const { chainId, address, className, showTitle } = props;
  const symbol = useSymbol({ chainId, address });
  const { data } = useTokenIcon({ chainId, address, retry: true });

  if (data) {
    const path = getTokenPath({ chainId, address });

    return (
      <img
        className={cn('rounded-full', className)}
        src={`${ASSETS_API_URL}/${path}`}
        alt={symbol}
        title={showTitle ? symbol : undefined}
      />
    );
  }

  return <TokenIconPlaceholder {...props} />;
};

const TokenIconCreator = (props: ContentProps) => {
  const { address, chainId } = props;
  const { data } = useCreateTokenIcon({ address, chainId });

  if (data) return <TokenIconDisplay {...props} />;
  return <TokenIconPlaceholder {...props} />;
};

const TokenIconPlaceholder = ({
  address,
  chainId,
  className,
}: {
  chainId: number;
  address?: Address;
  className?: string;
}) => {
  const symbol = useSymbol({ chainId, address });

  return (
    <div
      className={cn(
        'w-5 h-5 rounded-full bg-muted text-xs text-muted-foreground flex items-center justify-center',
        className,
      )}
    >
      {symbol && <p className="truncate">{symbol}</p>}
    </div>
  );
};
