import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { mainnet } from 'viem/chains';
import { Address, decodeEventLog, parseAbi } from 'viem';

import '@nomicfoundation/hardhat-toolbox-viem';

/**
 * Integration test for PT Price Feed Factory on Mainnet
 *
 * This test verifies that a user can successfully create a PT Price Feed using the factory
 * contract and that the PtPriceFeedCreated event is emitted with correct parameters.
 */
describe(
  'PT Price Feed Factory - Create Price Feed',
  { timeout: 60_000 },
  () => {
    // Test configuration
    const BLOCK_NUMBER = 23576801;
    const PT_PRICE_FEED_FACTORY = '0xE2a264e9fb3aC248BF9Ce57F376873DCa752DB9b';
    const PENDLE_ORACLE = '0x9a9Fa8338dd5E5B2188006f1Cd2Ef26d921650C2';
    const PENDLE_MARKET = '0x8AF9872eeE05c7Ca1c24295426E4d71b4AF5B559';
    const PRICE_ORACLE_MIDDLEWARE =
      '0xC9F32d65a278b012371858fD3cdE315B12d664c6';
    const TWAP_WINDOW = 300;
    const PENDLE_ORACLE_METHOD = 1; // Pt To Asset Rate
    const USER_ACCOUNT = '0xf2C6a2225BE9829eD77263b032E3D92C52aE6694';

    let connection: NetworkConnection<'l1'>;

    before(async () => {
      connection = await network.connect({
        network: 'hardhatMainnet',
        chainType: 'l1',
        override: {
          chainId: mainnet.id,
          forking: {
            url: env.RPC_URL_MAINNET,
            blockNumber: BLOCK_NUMBER,
          },
        },
      });
    });

    after(async () => {
      await connection.close();
    });

    it('should create a PT price feed and emit PtPriceFeedCreated event', async () => {
      const { viem } = connection;
      const publicClient = await viem.getPublicClient();
      const testClient = await viem.getTestClient();

      // Define ABIs
      const factoryAbi = parseAbi([
        'function create(address pendleOracle_, address pendleMarket_, uint32 twapWindow_, address priceMiddleware_, uint256 usePendleOracleMethod_, int256 expextedPriceAfterDeployment_) external returns (address)',
        'function calculatePrice(address pendleMarket_, uint32 twapWindow_, address priceMiddleware_, uint256 usePendleOracleMethod_) external view returns (int256)',
        'event PtPriceFeedCreated(address priceFeed, address pendleMarket)',
      ]);

      const priceFeedAbi = parseAbi([
        'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
      ]);

      // Step 1: Calculate expected price
      const expectedPrice = await publicClient.readContract({
        address: PT_PRICE_FEED_FACTORY as Address,
        abi: factoryAbi,
        functionName: 'calculatePrice',
        args: [
          PENDLE_MARKET as Address,
          TWAP_WINDOW,
          PRICE_ORACLE_MIDDLEWARE as Address,
          BigInt(PENDLE_ORACLE_METHOD),
        ],
      });

      expect(expectedPrice > 0n, 'Expected price should be greater than 0').to
        .be.true;

      // Step 2: Setup account
      await testClient.request({
        method: 'hardhat_impersonateAccount',
        params: [USER_ACCOUNT],
      });

      const userClient = await viem.getWalletClient(USER_ACCOUNT);

      await testClient.setBalance({
        address: USER_ACCOUNT as Address,
        value: BigInt(1e18), // 1 ETH
      });

      // Set low gas fees to avoid "maxFeePerGas too low" errors in test environment
      await testClient.request({
        method: 'hardhat_setNextBlockBaseFeePerGas',
        params: ['0x1'],
      });

      // Step 3: Execute transaction to create PT Price Feed
      const txHash = await userClient.writeContract({
        address: PT_PRICE_FEED_FACTORY as Address,
        abi: factoryAbi,
        functionName: 'create',
        args: [
          PENDLE_ORACLE as Address,
          PENDLE_MARKET as Address,
          TWAP_WINDOW,
          PRICE_ORACLE_MIDDLEWARE as Address,
          BigInt(PENDLE_ORACLE_METHOD),
          expectedPrice,
        ],
        account: USER_ACCOUNT as Address,
      });

      // Step 4: Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      expect(receipt.status).to.equal('success', 'Transaction should succeed');

      // Step 5: Verify PtPriceFeedCreated event was emitted
      const eventAbi = factoryAbi.find(
        (item) => item.type === 'event' && item.name === 'PtPriceFeedCreated',
      );

      expect(eventAbi).to.not.be.undefined;

      const logs = receipt.logs.filter(
        (log) =>
          log.address.toLowerCase() === PT_PRICE_FEED_FACTORY.toLowerCase(),
      );

      expect(logs.length).to.be.greaterThan(
        0,
        'Factory should emit at least one event',
      );

      // Decode the PtPriceFeedCreated event
      let priceFeedAddress: Address | undefined;
      let foundEvent = false;

      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'PtPriceFeedCreated') {
            foundEvent = true;
            const { priceFeed, pendleMarket } = decoded.args as {
              priceFeed: Address;
              pendleMarket: Address;
            };

            // Verify event parameters
            expect(priceFeed).to.not.equal(
              '0x0000000000000000000000000000000000000000',
              'Price feed address should not be zero address',
            );
            expect(pendleMarket.toLowerCase()).to.equal(
              PENDLE_MARKET.toLowerCase(),
              'Event should emit correct Pendle market address',
            );

            priceFeedAddress = priceFeed;
            break;
          }
        } catch (error) {
          // Skip logs the rest of the logs
          continue;
        }
      }

      expect(foundEvent).to.be.true;
      expect(priceFeedAddress).to.not.be.undefined;

      // Step 6: Verify the created price feed returns a valid price
      const priceData = await publicClient.readContract({
        address: priceFeedAddress!,
        abi: priceFeedAbi,
        functionName: 'latestRoundData',
      });

      const [, answer, , ,] = priceData;

      // Verify the price feed is functional
      expect(answer > 0n, 'Price feed should return a positive price').to.be
        .true;
    });
  },
);
