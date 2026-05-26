import { Address, erc20Abi, isAddressEqual } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { unique } from 'remeda';
import { SetupRule } from '../setup.types';
import { MARKET_ID } from '../../markets/market-id';
import { substrateToAddress } from '../../substrates/utils/substrate-to-address';

type ValidationResult = {
  notTrackedTokens: Array<{
    tokenAddress: Address;
    marketIds: bigint[];
  }>;
};

const RULE_ID = 'ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS';

/**
 * Setup validation rule that ensures all ERC20 token substrates used across markets
 * are properly tracked in the ERC20_VAULT_BALANCE market for accurate balance reporting.
 */
export const ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS = {
  id: RULE_ID,
  title: 'All ERC20 substrates are tracked in the vault',
  description: 'Validates that all ERC20 substrates are tracked in the vault.',
  validate: async (plasmaVault: PlasmaVault) => {
    const allMarketIds = await plasmaVault.getMarketIds();

    // Build a map of token address to market IDs that use it
    const tokenToMarketsMap = new Map<Address, bigint[]>();

    for (const marketId of allMarketIds) {
      const marketSubstrates = await plasmaVault.getMarketSubstrates(marketId);

      for (const substrate of marketSubstrates) {
        const address = substrateToAddress(substrate);
        if (address) {
          // Check if it's an ERC20 token
          try {
            await plasmaVault.publicClient.readContract({
              address,
              abi: erc20Abi,
              functionName: 'symbol',
            });

            // It's an ERC20 token, add market ID to the map
            const existingMarkets = tokenToMarketsMap.get(address) || [];
            tokenToMarketsMap.set(address, [...existingMarkets, marketId]);
          } catch (error) {
            // Not an ERC20 token, skip
          }
        }
      }
    }

    // Get tokens tracked in ERC20_VAULT_BALANCE
    const trackedTokens = await plasmaVault.getMarketSubstrates(
      MARKET_ID.ERC20_VAULT_BALANCE,
    );
    const trackedTokenAddresses = trackedTokens
      .map((substrate) => substrateToAddress(substrate))
      .filter((address) => address !== undefined);

    // Find tokens that are used in markets but not tracked
    const notTrackedTokens: Array<{
      tokenAddress: Address;
      marketIds: bigint[];
    }> = [];

    for (const [tokenAddress, marketIds] of tokenToMarketsMap.entries()) {
      const isTracked = trackedTokenAddresses.some((trackedToken) =>
        isAddressEqual(trackedToken, tokenAddress),
      );

      const isUnderlyingTokenAddress = isAddressEqual(
        tokenAddress,
        plasmaVault.assetAddress,
      );

      if (!isTracked && !isUnderlyingTokenAddress) {
        notTrackedTokens.push({
          tokenAddress,
          marketIds: unique(marketIds),
        });
      }
    }

    if (notTrackedTokens.length > 0) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'info',
          message: 'Some ERC20 substrates are not tracked in the vault.',
          violations: { notTrackedTokens },
        },
      };
    }

    return {
      ruleId: RULE_ID,
      value: {
        status: 'ok',
        message: 'All ERC20 substrates are tracked in the vault.',
      },
    };
  },
} as const satisfies SetupRule<ValidationResult>;
