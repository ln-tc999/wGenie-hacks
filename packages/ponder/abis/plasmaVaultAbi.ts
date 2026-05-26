import { erc4626ABI } from './erc4626ABI';
import { allFusesEventsAbi } from './all-fuses-events';

export const plasmaVaultAbi = [...erc4626ABI, ...allFusesEventsAbi] as const;
