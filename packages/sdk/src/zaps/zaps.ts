import { mintRusdFromUsdc } from '../markets/reservoir/zaps/mint-rusd-from-usdc';
import { wrapTac } from '../markets/tac/zaps/wrap-tac';
import { stakeEthToSteth } from '../markets/lido/zaps/stake-eth-to-steth';
import { unwrapWstethToSteth } from '../markets/lido/zaps/unwrap-wsteth-to-steth';
import { ZapsRegistry } from './zaps.types';

export const PLASMA_VAULT_ZAP = {
  mintRusdFromUsdc,
  wrapTac,
  stakeEthToSteth,
  unwrapWstethToSteth,
} as const satisfies ZapsRegistry;
