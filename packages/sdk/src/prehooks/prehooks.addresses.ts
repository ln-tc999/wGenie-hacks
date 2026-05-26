import { createChainAddresses } from '../utils/create-chain-addresses';
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

export const UNIVERSAL_READER_PREHOOKS_INFO_ADDRESSES = createChainAddresses({
  [mainnet.id]: '0x1Ecd96FD20f2c1a32e5906CCcAEc87e8aFe19821',
  [base.id]: '0x79D31b98382C5D325aB42353Ce1aE7081757C89A',
  [arbitrum.id]: '0x2774465A0BA2cf97F8b3624d59964FfC41b7ff0f',
  [unichain.id]: '0x0d828bb5bde258055674e55a343a18b0d756e5bf',
  [tac.id]: '0x817d48141e8b140d313acB670db01CE0B9A0D0Db',
  [ink.id]: '0xF27f66525004481Ce2fC0dc7e2E3BA12Fe4B089C',
  [plasma.id]: '0x9C5D3Fe1567BF6E368EAAD02516e9C08397F9Bf1',
  [avalanche.id]: '0x96Aca24aC5A172C8e19Ea903C7A2585bFE189B25',
});
