import {
  mainnet,
  base,
  arbitrum,
  unichain,
  tac,
  ink,
  plasma,
  avalanche,
} from 'viem/chains';
import { createChainAddresses } from './utils/create-chain-addresses';

export const UNIVERSAL_READER_BALANCE_FUSES_ADDRESSES = createChainAddresses({
  [mainnet.id]: '0x870E1Fb75BEdbc2eFB92857DC2B2cF171a0AEC1f',
  [base.id]: '0xE33F6a15D382CeabB8f351320BF63EE2860E8203',
  [arbitrum.id]: '0xacDB88ea2E2D248369b5b3137Fc3f971543d706c',
  [unichain.id]: '0x65fb961658b4d3d6ca0a47b741c5d181c25c64f4',
  [tac.id]: '0xAbD1823440f718f2f5F8B549868600Ea7Fd5A72a',
  [ink.id]: '0x9Da21B83375041937C3D91cCA2cCb11E3e427FbB',
  [plasma.id]: '0x221Dad9b50596700893753E4331289768CbF9C5F',
  [avalanche.id]: '0x4F78F29Ac7078A2B6A0D73820DD2E88C90E3683e',
});

export const ERC4626_ZAP_IN_WITH_NATIVE_TOKEN_ADDRESS = createChainAddresses({
  [mainnet.id]: '0x677251190C0cCcC6E7e71C385B3EA660Dfd89c00',
  [arbitrum.id]: '0x3285A189127E9d6f4Ed991f2976cae5625712D5E',
  [tac.id]: '0xd4b9fDDb1cEE0407d702215f04a52e9a08289660',
  [unichain.id]: '0x9d132CF83BF9160fa8BF31b95C8A29E46cB815f7',
  [ink.id]: '0x953d2890f39361CF0A776cC1D9B5D2789fC05d53',
  [base.id]: '0xEbCf47837ad71Fc98d5B608356eaC1FF38fa67DB',
});
