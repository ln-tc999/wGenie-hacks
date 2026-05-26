/**
 * Setup rule that detects stale instant withdrawal configurations.
 *
 * This rule identifies instant withdrawal config entries that reference:
 * 1. Fuses that have been removed from the vault
 * 2. Substrates that have been removed from their markets
 *
 * These stale entries should be removed from the instant withdrawal configuration.
 */
import { Address, Hex, isAddressEqual } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { SetupRule } from '../setup.types';
import { fuseAbi } from '../../abi/fuse.abi';
import { isSubstrateEqualSafe } from '../../substrates/utils/is-substrate-equal-safe';

/**
 * Contains information about instant withdrawal configurations that are invalid.
 */
type ValidationResult = {
  invalidConfigs: Array<{
    fuseAddress: Address;
    substrate: Hex;
    marketId: bigint;
    reason: 'fuse_not_in_vault' | 'substrate_not_in_market_substrates';
  }>;
};

const RULE_ID = 'INSTANT_WITHDRAW_ORDER_INVALID';

export const INSTANT_WITHDRAW_ORDER_INVALID = {
  id: RULE_ID,
  title: 'Stale instant withdrawal configurations detected',
  description:
    'Detects instant withdrawal configurations that reference deleted fuses or substrates.',
  validate: async (plasmaVault: PlasmaVault) => {
    // Get instant withdrawal fuses
    const instantWithdrawalFuses =
      await plasmaVault.getInstantWithdrawalFuses();

    // If no instant withdrawal configs, validation is not applicable
    if (instantWithdrawalFuses.length === 0) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'not-applicable',
        },
      };
    }

    // Get vault's fuses for validation
    const vaultFuses = await plasmaVault.getFuses();

    // Build instant withdrawal configs with market IDs
    const configsWithParams = await Promise.all(
      instantWithdrawalFuses.map(async (fuseAddress, index) => {
        if (!fuseAddress) return null;

        const params = await plasmaVault.getInstantWithdrawalFusesParams(
          fuseAddress,
          index,
        );
        const substrate = params[1]; // params[0] is zeroHex and not relevant

        if (!substrate) return null;

        const marketId = await plasmaVault.publicClient.readContract({
          address: fuseAddress,
          abi: fuseAbi,
          functionName: 'MARKET_ID',
        });

        return {
          fuseAddress,
          substrate,
          marketId,
        };
      }),
    );

    const configs = configsWithParams.filter(
      (config): config is NonNullable<typeof config> => config !== null,
    );

    // Validate each config and collect violations
    const invalidConfigs = (
      await Promise.all(
        configs.map(async ({ fuseAddress, substrate, marketId }) => {
          // Check 1: Fuse exists in vault's fuses
          const isFuseInVault = vaultFuses.some((vaultFuse) =>
            isAddressEqual(vaultFuse, fuseAddress),
          );

          // Check 2: Substrate exists in market substrates
          const marketSubstrates =
            await plasmaVault.getMarketSubstrates(marketId);
          const isSubstrateInMarket = marketSubstrates.some((marketSubstrate) =>
            isSubstrateEqualSafe(marketSubstrate, substrate),
          );

          // Return violations for this config
          return [
            ...(!isFuseInVault
              ? [
                  {
                    fuseAddress,
                    substrate,
                    marketId,
                    reason: 'fuse_not_in_vault' as const,
                  },
                ]
              : []),
            ...(!isSubstrateInMarket
              ? [
                  {
                    fuseAddress,
                    substrate,
                    marketId,
                    reason: 'substrate_not_in_market_substrates' as const,
                  },
                ]
              : []),
          ];
        }),
      )
    ).flat();

    // Return result
    if (invalidConfigs.length > 0) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'error',
          message: 'Stale instant withdrawal configurations detected.',
          violations: { invalidConfigs },
        },
      };
    }

    return {
      ruleId: RULE_ID,
      value: {
        status: 'ok',
        message: 'Instant withdrawal configuration is valid.',
      },
    };
  },
} as const satisfies SetupRule<ValidationResult>;
