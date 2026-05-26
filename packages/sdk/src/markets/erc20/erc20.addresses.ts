import { arbitrum, base, mainnet, unichain } from 'viem/chains';

export const USDC_ADDRESS = {
  [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [unichain.id]: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
} as const;
