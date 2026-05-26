import {
  mainnet,
  arbitrum,
  base,
  unichain,
  plasma,
  avalanche,
} from 'viem/chains';
import { createChainAddresses } from '../../utils/create-chain-addresses';

export const EULER_V2_SUPPLY_FUSE_ADDRESS = createChainAddresses({
  [mainnet.id]: '0xDd33b4b6b9A7aA6fcC5F1D1c8ebB649A796Fd5B5',
  [arbitrum.id]: '0x920f6c81666877490A8D6dcFEFd85d151Ef04B7d',
  [base.id]: '0x96901b9A10f2A7f856a97ff148c4Cf3A0077d1ab',
  [unichain.id]: '0xBf8759c387b9C44aD304B0778c12437A520f93A1',
  [plasma.id]: '0xe0497Ffee6cdf82e87b011BF44090e4ec1269E70',
  [avalanche.id]: '0xdD02ad9A1d40FE1BA14812729db1272EF42A497F',
});
