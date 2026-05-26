import { arbitrum, base, mainnet } from 'viem/chains';

export const WSTETH_ADDRESS = {
  [mainnet.id]: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  [arbitrum.id]: '0x5979D7b546E38E414F7E9822514be443A4800529',
  [base.id]: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
} as const;

export const STETH_ADDRESS = {
  [mainnet.id]: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
} as const;
