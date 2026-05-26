import { Address, Hex } from 'viem';
import { PlasmaVault } from '../../PlasmaVault';
import { SetupRule } from '../setup.types';
import { MARKET_ID } from '../../markets/market-id';
import { priceOracleMiddlewareAbi } from '../../abi/price-oracle-middleware.abi';
import { MORPHO_ADDRESS } from '../../markets/morpho/morpho.addresses';
import { morphoAbi } from '../../markets/morpho/abi/morpho.abi';

/**
 * Represents the validation result for Morpho markets without price feeds.
 * Contains information about markets that have tokens lacking price feed data.
 */
type ValidationResult = {
  marketsWithoutPriceFeed: Array<{
    morphoMarketId: Hex; // bytes32 - The unique identifier of the Morpho market
    loanToken: Address | undefined; // Address of loan token without price feed (undefined if has price feed)
    collateralToken: Address | undefined; // Address of collateral token without price feed (undefined if has price feed)
  }>;
};

const RULE_ID = 'MORPHO_MARKETS_WITHOUT_PRICE_FEED';

/**
 * Setup rule that validates all tokens in Morpho markets have valid price feeds.
 *
 * This rule ensures that both loan tokens and collateral tokens in all Morpho markets
 * configured in the Plasma Vault have corresponding price feeds in the price oracle.
 * Without proper price feeds, the vault cannot accurately value positions or perform
 * risk management calculations.
 *
 * @example
 * // Usage in validation
 * const result = await validateSetup(plasmaVault, SETUP_RULE.MORPHO_MARKETS_WITHOUT_PRICE_FEED);
 * if (result) {
 *   console.log('Markets with missing price feeds:', result.value);
 * }
 */
export const MORPHO_MARKETS_WITHOUT_PRICE_FEED = {
  id: RULE_ID,
  title: 'All Morpho market tokens have price feeds',
  description:
    'Validates that all tokens in Morpho markets have valid price feeds.',
  validate: async (plasmaVault: PlasmaVault) => {
    const marketIds = await plasmaVault.getMarketIds({
      include: ['fuses', 'balanceFuses'],
    });

    if (!marketIds.includes(MARKET_ID.MORPHO)) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'not-applicable',
        },
      };
    }

    // Get all Morpho market IDs configured in the plasma vault
    const morphoMarketIds = await plasmaVault.getMarketSubstrates(
      MARKET_ID.MORPHO,
    );

    const { chainId } = plasmaVault;

    // Get the Morpho contract address for the current chain
    const morphoAddress = MORPHO_ADDRESS[chainId];

    if (morphoAddress === undefined) {
      throw new Error(`Morpho address is not supported for chain ${chainId}`);
    }

    // Fetch market parameters (loan token and collateral token) for each Morpho market
    const morphoMarketParams = await plasmaVault.publicClient.multicall({
      contracts: morphoMarketIds.map((morphoMarketId) => {
        return {
          address: morphoAddress,
          functionName: 'idToMarketParams',
          args: [morphoMarketId],
          abi: morphoAbi,
        } as const;
      }),
      allowFailure: false,
    });

    // Check price feed availability for both loan and collateral tokens of each market
    const results = await plasmaVault.publicClient.multicall({
      contracts: morphoMarketParams.flatMap((result) => {
        const [loanTokenAddress, collateralTokenAddress] = result;

        return [
          {
            address: plasmaVault.priceOracle,
            abi: priceOracleMiddlewareAbi,
            functionName: 'getAssetPrice',
            args: [loanTokenAddress],
          },
          {
            address: plasmaVault.priceOracle,
            abi: priceOracleMiddlewareAbi,
            functionName: 'getAssetPrice',
            args: [collateralTokenAddress],
          },
        ];
      }),
      allowFailure: true,
    });

    // Separate results for loan tokens (even indices) and collateral tokens (odd indices)
    const loanTokenPrices = results.filter((_, index) => index % 2 === 0);
    const collateralTokenPrices = results.filter((_, index) => index % 2 === 1);

    // Build result array with market info and tokens that lack price feeds
    const morphoMarkets = morphoMarketIds
      .map((morphoMarketId, index) => {
        const merketParams = morphoMarketParams[index];
        if (merketParams === undefined) return undefined;

        const [loanTokenAddress, collateralTokenAddress] = merketParams;

        return {
          morphoMarketId,
          // Include token address only if price feed is missing (result is falsy)
          loanToken: loanTokenPrices[index]?.result
            ? undefined
            : loanTokenAddress,
          collateralToken: collateralTokenPrices[index]?.result
            ? undefined
            : collateralTokenAddress,
        };
      })
      .filter((market) => market !== undefined);

    // Filter to only markets that have at least one token without a price feed
    const marketsWithoutPriceFeed = morphoMarkets.filter(
      ({ loanToken, collateralToken }) => {
        return loanToken !== undefined || collateralToken !== undefined;
      },
    );

    // Return validation error if any markets have tokens without price feeds
    if (marketsWithoutPriceFeed.length > 0) {
      return {
        ruleId: RULE_ID,
        value: {
          status: 'warning',
          message: 'Some Morpho market tokens do not have price feeds.',
          violations: { marketsWithoutPriceFeed },
        },
      };
    }

    return {
      ruleId: RULE_ID,
      value: {
        status: 'ok',
        message: 'All Morpho market tokens have price feeds.',
      },
    };
  },
} as const satisfies SetupRule<ValidationResult>;
