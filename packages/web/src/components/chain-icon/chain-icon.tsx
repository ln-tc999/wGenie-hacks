import { MainnetSvg } from './mainnet-svg';
import { ArbitrumSvg } from './arbitrum-svg';
import { BaseSvg } from './base-svg';
import { AvalancheSvg } from './avalanche-svg';
import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';
import { arbitrum, base, mainnet, avalanche } from 'viem/chains';

interface Props {
  chainId: number;
  className?: string;
}

export const ChainIcon = ({ chainId, className }: Props) => {
  if (chainId === mainnet.id) {
    return (
      <Wrapper className={className}>
        <MainnetSvg />
      </Wrapper>
    );
  }

  if (chainId === arbitrum.id) {
    return (
      <Wrapper className={className}>
        <ArbitrumSvg />
      </Wrapper>
    );
  }

  if (chainId === base.id) {
    return (
      <Wrapper className={className}>
        <BaseSvg />
      </Wrapper>
    );
  }

  if (chainId === avalanche.id) {
    return (
      <Wrapper className={cn(className, 'p-0')}>
        <AvalancheSvg />
      </Wrapper>
    );
  }

  return <Wrapper className={className} />;
};

const Wrapper = ({
  children,
  className,
}: PropsWithChildren & { className?: string }) => {
  return (
    <div
      className={cn('w-6 h-6 relative bg-white rounded-full p-0.5', className)}
    >
      {children}
    </div>
  );
};
