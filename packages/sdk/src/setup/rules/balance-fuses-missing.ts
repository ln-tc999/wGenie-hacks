import { PlasmaVault } from '../../PlasmaVault';
import { SetupRule } from '../setup.types';

/**
 * Contains information about markets that lack the Balance Fuse.
 */
type ValidationResult = {
  marketIdsWithoutBalanceFuse: bigint[];
};

const RULE_ID = 'BALANCE_FUSES_MISSING';

/**
 * Setup rule that validates all markets have balance fuse when marketId is used.
 *
 * This rule ensures that when the marketId is configured in the Plasma Vault,
 * then the balance fuse for that marketId is also configured in the Plasma Vault.
 * This is critical for proper balance tracking and accounting across all markets.
 *
 * @example
 * // Usage in validation
 * const result = await validateSetup(plasmaVault, SETUP_RULE.BALANCE_FUSES_MISSING);
 * if (result) {
 *   console.log('Markets missing balance fuses:', result.value);
 * }
 */
export const BALANCE_FUSES_MISSING = {
  id: RULE_ID,
  title: 'All markets have balance fuse',
  description:
    'Validates that all markets have balance fuse when marketId is used.',
  validate: async (plasmaVault: PlasmaVault) => {
    const marketIdsToVerify = await plasmaVault.getMarketIds({
      include: ['fuses'],
    });

    const balanceFusesMarketIds = await plasmaVault.getMarketIds({
      include: ['balanceFuses'],
    });

    const marketIdsWithoutBalanceFuse = marketIdsToVerify.filter(
      (marketId) => !balanceFusesMarketIds.includes(marketId),
    );

    // If some markets are missing a balance fuse, validation not passes
    if (marketIdsWithoutBalanceFuse.length > 0) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'error',
          message: 'Some markets are missing balance fuses.',
          violations: { marketIdsWithoutBalanceFuse },
        },
      };
    }

    return {
      ruleId: RULE_ID,
      value: {
        status: 'ok',
        message: 'This vault has all necessary balance fuses.',
      },
    };
  },
} as const satisfies SetupRule<ValidationResult>;
