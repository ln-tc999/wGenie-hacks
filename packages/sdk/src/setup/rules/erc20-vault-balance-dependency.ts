import { PlasmaVault } from '../../PlasmaVault';
import { SetupRule } from '../setup.types';
import { MARKET_ID, TECH_MARKET_ID } from '../../markets/market-id';

/**
 * Contains information about markets that lack the ERC20_VAULT_BALANCE dependency.
 */
type ValidationResult = {
  marketsMissingDependency: Array<{
    marketId: bigint; // The market ID missing ERC20_VAULT_BALANCE dependency
    dependencies: readonly bigint[]; // Current dependencies of the market
  }>;
};

const RULE_ID = 'ERC20_VAULT_BALANCE_DEPENDENCY_MISSING';

/**
 * Setup rule that validates all markets have ERC20 vault balance dependency when ERC20 vault balance market is used.
 *
 * This rule ensures that when the ERC20_VAULT_BALANCE market is configured in the Plasma Vault,
 * all other markets have the ERC20_VAULT_BALANCE market as a dependency in their dependency balance graph.
 * This is critical for proper balance tracking and accounting across all markets.
 *
 * @example
 * // Usage in validation
 * const result = await validateSetup(plasmaVault, SETUP_RULE.ERC20_VAULT_BALANCE_DEPENDENCY_MISSING);
 * if (result) {
 *   console.log('Markets missing ERC20 vault balance dependency:', result.value);
 * }
 */
export const ERC20_VAULT_BALANCE_DEPENDENCY_MISSING = {
  id: RULE_ID,
  title: 'All markets have ERC20 vault balance dependency',
  description:
    'Validates that all markets have ERC20 vault balance dependency when ERC20 vault balance market is used.',
  validate: async (plasmaVault: PlasmaVault) => {
    const marketIds = await plasmaVault.getMarketIds({
      include: ['fuses', 'balanceFuses'],
    });

    const isErc20VaultBalanceMarketUsed = marketIds.includes(
      MARKET_ID.ERC20_VAULT_BALANCE,
    );

    // If ERC20 vault balance market is not used, validation passes
    if (!isErc20VaultBalanceMarketUsed)
      return {
        ruleId: RULE_ID,
        value: {
          status: 'ok',
          message: 'This vault does not use ERC20 vault balance market.',
        },
      };

    const dependencyGraphResults =
      await plasmaVault.getAllDependencyBalanceGraphs({
        include: ['fuses', 'balanceFuses'],
      });

    const marketsMissingDependency = dependencyGraphResults.filter(
      ({ dependencies, marketId }) => {
        if (
          marketId === MARKET_ID.ERC20_VAULT_BALANCE ||
          marketId === TECH_MARKET_ID.ZERO_BALANCE_MARKET_ID
        )
          return false;
        return !dependencies.includes(MARKET_ID.ERC20_VAULT_BALANCE);
      },
    );

    if (marketsMissingDependency.length > 0) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'error',
          message: 'Some markets are missing ERC20 vault balance dependency.',
          violations: { marketsMissingDependency },
        },
      };
    }

    return {
      ruleId: RULE_ID,
      value: {
        status: 'ok',
        message: 'All markets have ERC20 vault balance dependency.',
      },
    };
  },
} as const satisfies SetupRule<ValidationResult>;
