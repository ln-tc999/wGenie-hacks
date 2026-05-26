import { SETUP_RULE } from './setup.types';
import { PlasmaVault } from '../PlasmaVault';

const RULES = Object.values(SETUP_RULE);

export const validateSetupAllRules = async (plasmaVault: PlasmaVault) => {
  const result = await Promise.all(
    RULES.map((rule) => rule.validate(plasmaVault)),
  );
  return result;
};
