import { arbitrum, base, ink, mainnet, unichain } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

export const MORPHO_ADDRESS = createChainAddresses({
  [mainnet.id]: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  [arbitrum.id]: '0x6c247b1F6182318877311737BaC0844bAa518F5e',
  [base.id]: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  [unichain.id]: '0x8f5ae9CddB9f68de460C77730b018Ae7E04a140A',
  [ink.id]: '0x857f3EefE8cbda3Bc49367C996cd664A880d3042',
});
