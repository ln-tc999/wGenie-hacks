import { createPublicClient, extractChain, http } from 'viem';
import { ChainId, chains } from './chains';
import { arbitrum, avalanche, base, mainnet, plasma, unichain } from 'viem/chains';

export const getPublicClient = (chainId: ChainId) => {
  const chain = extractChain({
    chains,
    id: chainId,
  });

  return createPublicClient({
    chain,
    transport: http(RPC_URL[chainId], {
      timeout: 10_000, // 10 second timeout
    }),
  });
};

const RPC_URL: Record<ChainId, string> = {
  [mainnet.id]: process.env.PONDER_RPC_URL_MAINNET!,
  [arbitrum.id]: process.env.PONDER_RPC_URL_ARBITRUM!,
  [base.id]: process.env.PONDER_RPC_URL_BASE!,
  [unichain.id]: process.env.PONDER_RPC_URL_UNICHAIN!,
  [avalanche.id]: process.env.PONDER_RPC_URL_AVALANCHE!,
  [plasma.id]: process.env.PONDER_RPC_URL_PLASMA!,
};
