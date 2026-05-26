import { SetupRule } from './setup.types';
import { PlasmaVault } from '../PlasmaVault';

export const validateSetup = async <TValue extends unknown>(
  plasmaVault: PlasmaVault,
  rule: SetupRule<TValue>,
) => {
  const result = await rule.validate(plasmaVault);
  return result;
};
