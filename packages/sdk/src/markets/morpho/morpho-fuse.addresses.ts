import { mainnet, arbitrum, base, unichain } from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

export const MORPHO_SUPPLY_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0xD08Cb606CEe700628E55b0B0159Ad65421E6c8Df',
  [base.id]: '0xae93EF3cf337b9599F0dfC12520c3C281637410F',
  [unichain.id]: '0xea13241E2D0EF964Ee616151e72d493496A568F5',
  [arbitrum.id]: '0x5Ea9d92fb3975f9f9d1Fa69b98A37BF4dDe61e2a',
});

export const MORPHO_BORROW_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0x9981e75b7254fD268C9182631Bf89C86101359d6',
  [base.id]: '0x35f44aD1D9F2773dA05F4664bf574C760bA47bf6',
  [unichain.id]: '0x8A84b69aFCCAC94b5Fb0a4894D0fA016dB2CF020',
});
