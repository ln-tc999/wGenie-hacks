import { before, describe, it, after } from 'node:test';
import { network } from 'hardhat';
import { NetworkConnection } from 'hardhat/types/network';
import { env } from '../../lib/env';
import { base } from 'viem/chains';
import { FuseWhitelist, MARKET_ID } from '@wgenie/fusion-sdk';
import { expect } from 'chai';

import '@nomicfoundation/hardhat-toolbox-viem';

/**
 * Tests for FuseWhitelist contract functionality.
 * Tests all query methods against the deployed contract on Base.
 */
describe('FuseWhitelist Query Methods', () => {
  const BLOCK_NUMBER = 36047230;
  const FUSE_WHITELIST_ADDRESS = '0x762a4dB8BAFffCf6c4C65Fa3371d77b8Ede04596';

  let connection: NetworkConnection<'op'>;
  let fuseWhitelist: FuseWhitelist;

  before(async () => {
    connection = await network.connect({
      network: 'hardhatBase',
      chainType: 'op',
      override: {
        chainId: base.id,
        forking: {
          url: env.RPC_URL_BASE,
          blockNumber: BLOCK_NUMBER,
        },
      },
    });

    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    fuseWhitelist = await FuseWhitelist.create(
      publicClient,
      FUSE_WHITELIST_ADDRESS,
    );
  });

  after(async () => {
    await connection.close();
  });

  describe('getFuseTypes', () => {
    it('should return exact fuse types snapshot', async () => {
      const fuseTypes = await fuseWhitelist.getFuseTypes();

      expect(fuseTypes).to.deep.equal([
        { id: 1, name: 'AAVE_V2_BALANCE_FUSE' },
        { id: 2, name: 'AAVE_V2_SUPPLY_FUSE' },
        { id: 3, name: 'AAVE_V3_BALANCE_FUSE' },
        { id: 4, name: 'AAVE_V3_SUPPLY_FUSE' },
        { id: 5, name: 'AAVE_V3_BORROW_FUSE' },
        { id: 6, name: 'BURN_REQUEST_FEE_FUSE' },
        { id: 7, name: 'SPARK_BALANCE_FUSE' },
        { id: 8, name: 'SPARK_SUPPLY_FUSE' },
        { id: 9, name: 'COMPOUND_V2_BALANCE_FUSE' },
        { id: 10, name: 'COMPOUND_V2_SUPPLY_FUSE' },
        { id: 11, name: 'COMPOUND_V3_BALANCE_FUSE' },
        { id: 12, name: 'COMPOUND_V3_SUPPLY_FUSE' },
        { id: 13, name: 'COMPOUND_V3_CLAIM_FUSE' },
        { id: 14, name: 'CURVE_CHILD_LIQUIDITY_GAUGE_BALANCE_FUSE' },
        { id: 15, name: 'CURVE_CHILD_LIQUIDITY_GAUGE_SUPPLY_FUSE' },
        { id: 16, name: 'CURVE_CHILD_LIQUIDITY_GAUGE_ERC4626_BALANCE_FUSE' },
        { id: 17, name: 'CURVE_STABLESWAP_NG_SINGLE_SIDE_BALANCE_FUSE' },
        { id: 18, name: 'CURVE_STABLESWAP_NG_SINGLE_SIDE_SUPPLY_FUSE' },
        { id: 19, name: 'CURVE_GAUGE_TOKEN_CLAIM_FUSE' },
        { id: 20, name: 'ERC20_BALANCE_FUSE' },
        { id: 21, name: 'ERC4626_BALANCE_FUSE' },
        { id: 22, name: 'ERC4626_SUPPLY_FUSE' },
        { id: 23, name: 'EULER_V2_BALANCE_FUSE' },
        { id: 24, name: 'EULER_V2_SUPPLY_FUSE' },
        { id: 25, name: 'EULER_V2_BORROW_FUSE' },
        { id: 26, name: 'EULER_V2_COLLATERAL_FUSE' },
        { id: 27, name: 'EULER_V2_CONTROLLER_FUSE' },
        { id: 28, name: 'FLUID_INSTADAPP_STAKING_BALANCE_FUSE' },
        { id: 29, name: 'FLUID_INSTADAPP_STAKING_SUPPLY_FUSE' },
        { id: 30, name: 'FLUID_INSTADAPP_CLAIM_FUSE' },
        { id: 31, name: 'FLUID_PROOF_CLAIM_FUSE' },
        { id: 32, name: 'GEARBOX_V3_FARM_BALANCE_FUSE' },
        { id: 33, name: 'GEARBOX_V3_FARM_SUPPLY_FUSE' },
        { id: 34, name: 'GEARBOX_V3_FARM_D_TOKEN_CLAIM_FUSE' },
        { id: 35, name: 'HARVEST_DO_HARD_WORK_FUSE' },
        { id: 36, name: 'MOONWELL_BALANCE_FUSE' },
        { id: 37, name: 'MOONWELL_SUPPLY_FUSE' },
        { id: 38, name: 'MOONWELL_BORROW_FUSE' },
        { id: 39, name: 'MOONWELL_ENABLE_MARKET_FUSE' },
        { id: 40, name: 'MOONWELL_CLAIM_FUSE' },
        { id: 41, name: 'MORPHO_BALANCE_FUSE' },
        { id: 42, name: 'MORPHO_BORROW_FUSE' },
        { id: 43, name: 'MORPHO_COLLATERAL_FUSE' },
        { id: 44, name: 'MORPHO_FLASH_LOAN_FUSE' },
        { id: 45, name: 'MORPHO_SUPPLY_FUSE' },
        { id: 46, name: 'MORPHO_SUPPLY_WITH_CALLBACK_DATA_FUSE' },
        { id: 47, name: 'MORPHO_CLAIM_FUSE' },
        { id: 48, name: 'PENDLE_REDEEM_PT_AFTER_MATURITY_FUSE' },
        { id: 49, name: 'PENDLE_SWAP_PT_FUSE' },
        { id: 50, name: 'PLASMA_VAULT_REQUEST_SHARES_FUSE' },
        { id: 51, name: 'PLASMA_VAULT_REDEEM_FROM_REQUEST_FUSE' },
        { id: 52, name: 'RAMSES_V2_BALANCE_FUSE' },
        { id: 53, name: 'RAMSES_V2_COLLECT_FUSE' },
        { id: 54, name: 'RAMSES_V2_MODIFY_POSITION_FUSE' },
        { id: 55, name: 'RAMSES_V2_NEW_POSITION_FUSE' },
        { id: 56, name: 'RAMSES_CLAIM_FUSE' },
        { id: 57, name: 'UNISWAP_V2_SWAP_FUSE' },
        { id: 58, name: 'UNISWAP_V3_BALANCE_FUSE' },
        { id: 59, name: 'UNISWAP_V3_COLLECT_FUSE' },
        { id: 60, name: 'UNISWAP_V3_MODIFY_POSITION_FUSE' },
        { id: 61, name: 'UNISWAP_V3_NEW_POSITION_FUSE' },
        { id: 62, name: 'UNISWAP_V3_SWAP_FUSE' },
        { id: 63, name: 'UNIVERSAL_TOKEN_SWAPPER_FUSE' },
        { id: 64, name: 'UNIVERSAL_TOKEN_SWAPPER_ETH_FUSE' },
        { id: 65, name: 'UNIVERSAL_TOKEN_SWAPPER_WITH_VERIFICATION_FUSE' },
        { id: 66, name: 'AAVE_V3_WITH_PRICE_ORACLE_BALANCE_FUSE' },
        { id: 67, name: 'FLUID_INSTADAPP_POOL_SUPPLY_FUSE' },
        { id: 68, name: 'FLUID_INSTADAPP_POOL_BALANCE_FUSE' },
        { id: 69, name: 'PENDLE_BALANCE_FUSE' },
        { id: 70, name: 'UNIVERSAL_READER_BALANCE_FUSE' },
        { id: 71, name: 'META_MORPHO_MARKET_0001_SUPPLY_FUSE' },
        { id: 72, name: 'META_MORPHO_MARKET_0001_BALANCE_FUSE' },
        { id: 73, name: 'UNISWAP_V3_SWAP_POSITIONS_BALANCE_FUSE' },
        { id: 74, name: 'COMPOUND_V3_USDC_BALANCE_FUSE' },
        { id: 75, name: 'COMPOUND_V3_WETH_BALANCE_FUSE' },
        { id: 76, name: 'ERC4626_MARKET_1_BALANCE_FUSE' },
        { id: 77, name: 'ERC4626_MARKET_2_BALANCE_FUSE' },
        { id: 78, name: 'ERC4626_MARKET_3_BALANCE_FUSE' },
        { id: 79, name: 'ERC4626_MARKET_4_BALANCE_FUSE' },
        { id: 80, name: 'ERC4626_MARKET_5_BALANCE_FUSE' },
        { id: 81, name: 'ERC4626_MARKET_6_BALANCE_FUSE' },
        { id: 82, name: 'ERC4626_MARKET_7_BALANCE_FUSE' },
        { id: 83, name: 'ERC4626_MARKET_8_BALANCE_FUSE' },
        { id: 84, name: 'ERC4626_MARKET_9_BALANCE_FUSE' },
        { id: 85, name: 'ERC4626_MARKET_10_BALANCE_FUSE' },
        { id: 86, name: 'ERC4626_MARKET_11_BALANCE_FUSE' },
        { id: 87, name: 'ERC4626_MARKET_12_BALANCE_FUSE' },
        { id: 88, name: 'ERC4626_MARKET_13_BALANCE_FUSE' },
        { id: 89, name: 'ERC4626_MARKET_14_BALANCE_FUSE' },
        { id: 90, name: 'COMPOUND_V3_USDC_SUPPLY_FUSE' },
        { id: 91, name: 'COMPOUND_V3_WETH_SUPPLY_FUSE' },
        { id: 92, name: 'ERC4626_MARKET_1_SUPPLY_FUSE' },
        { id: 93, name: 'ERC4626_MARKET_2_SUPPLY_FUSE' },
        { id: 94, name: 'ERC4626_MARKET_3_SUPPLY_FUSE' },
        { id: 95, name: 'ERC4626_MARKET_4_SUPPLY_FUSE' },
        { id: 96, name: 'ERC4626_MARKET_5_SUPPLY_FUSE' },
        { id: 97, name: 'ERC4626_MARKET_6_SUPPLY_FUSE' },
        { id: 98, name: 'ERC4626_MARKET_7_SUPPLY_FUSE' },
        { id: 99, name: 'ERC4626_MARKET_8_SUPPLY_FUSE' },
        { id: 100, name: 'ERC4626_MARKET_9_SUPPLY_FUSE' },
        { id: 101, name: 'ERC4626_MARKET_10_SUPPLY_FUSE' },
        { id: 102, name: 'ERC4626_MARKET_11_SUPPLY_FUSE' },
        { id: 103, name: 'ERC4626_MARKET_12_SUPPLY_FUSE' },
        { id: 104, name: 'ERC4626_MARKET_13_SUPPLY_FUSE' },
        { id: 105, name: 'ERC4626_MARKET_14_SUPPLY_FUSE' },
      ]);
    });
  });

  describe('getFuseStates', () => {
    it('should return exact fuse states snapshot', async () => {
      const fuseStates = await fuseWhitelist.getFuseStates();

      expect(fuseStates).to.deep.equal([
        { id: 0, name: 'DEFAULT' },
        { id: 1, name: 'ACTIVE' },
        { id: 2, name: 'DEPRECATED' },
        { id: 3, name: 'REMOVED' },
      ]);
    });
  });

  describe('getMetadataTypes', () => {
    it('should return exact metadata types snapshot', async () => {
      const metadataTypes = await fuseWhitelist.getMetadataTypes();

      expect(metadataTypes).to.deep.equal([
        { id: 0, type: 'AUDIT_STATUS' },
        { id: 1, type: 'SUBSTRATE_INFO' },
        { id: 2, type: 'CATEGORY_INFO' },
        { id: 3, type: 'ABI_VERSION' },
        { id: 4, type: 'PROTOCOL_INFO' },
      ]);
    });
  });

  describe('getFusesByType', () => {
    it('should return exact addresses for UNIVERSAL_TOKEN_SWAPPER_FUSE (type 63)', async () => {
      const UNIVERSAL_TOKEN_SWAPPER_FUSE = 63;

      const fuses = await fuseWhitelist.getFusesByType(
        UNIVERSAL_TOKEN_SWAPPER_FUSE,
      );

      expect(fuses).to.deep.equal([
        '0x706ca1cA4EcE9CF23301D6AB35ce6fb7Cf25DA15',
        '0x4d9cbA074b00249D0a7d390Ff8f038dE3Ae23317',
        '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
      ]);
    });
  });

  describe('getFusesByMarketId', () => {
    it('should return exact addresses for UNIVERSAL_TOKEN_SWAPPER market', async () => {
      const fuses = await fuseWhitelist.getFusesByMarketId(
        MARKET_ID.UNIVERSAL_TOKEN_SWAPPER,
      );

      expect(fuses).to.deep.equal([
        '0x706ca1cA4EcE9CF23301D6AB35ce6fb7Cf25DA15',
        '0x4d9cbA074b00249D0a7d390Ff8f038dE3Ae23317',
        '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
        '0x1DC6eC62bD4225Ec063049238CeF89635cdbff72',
        '0x38Bd09C17EA88ceB2F7916BF07AF13C2D9F72370',
      ]);
    });
  });

  describe('getFusesByTypeAndMarketIdAndStatus', () => {
    it('should return active UNIVERSAL_TOKEN_SWAPPER_FUSE fuses', async () => {
      const UNIVERSAL_TOKEN_SWAPPER_FUSE = 63;
      const ACTIVE_STATUS = 1;

      const fuses = await fuseWhitelist.getFusesByTypeAndMarketIdAndStatus(
        UNIVERSAL_TOKEN_SWAPPER_FUSE,
        MARKET_ID.UNIVERSAL_TOKEN_SWAPPER,
        ACTIVE_STATUS,
      );

      expect(fuses).to.deep.equal([
        '0x706ca1cA4EcE9CF23301D6AB35ce6fb7Cf25DA15',
        '0xdBc5f9962CE85749F1b3c51BA0473909229E3807',
      ]);
    });
  });

  describe('getFuseByAddress', () => {
    it('should return exact fuse info for Universal Token Swapper fuse', async () => {
      const FUSE_ADDRESS = '0xdBc5f9962CE85749F1b3c51BA0473909229E3807';
      const UNIVERSAL_TOKEN_SWAPPER_FUSE = 63;
      const ACTIVE_STATUS = 1;

      const fuseInfo = await fuseWhitelist.getFuseByAddress(FUSE_ADDRESS);

      expect(fuseInfo).to.deep.equal({
        fuseState: ACTIVE_STATUS,
        fuseType: UNIVERSAL_TOKEN_SWAPPER_FUSE,
        fuseAddress: FUSE_ADDRESS,
        timestamp: 1732608287,
      });
    });
  });

  describe('getFuseStateName', () => {
    it('should return correct name for ACTIVE state', async () => {
      const ACTIVE_STATE_ID = 1;

      const stateName = await fuseWhitelist.getFuseStateName(ACTIVE_STATE_ID);

      expect(stateName).to.equal('ACTIVE');
    });
  });

  describe('getFuseTypeDescription', () => {
    it('should return correct description for UNIVERSAL_TOKEN_SWAPPER_FUSE', async () => {
      const UNIVERSAL_TOKEN_SWAPPER_FUSE = 63;

      const description = await fuseWhitelist.getFuseTypeDescription(
        UNIVERSAL_TOKEN_SWAPPER_FUSE,
      );

      expect(description).to.equal('UNIVERSAL_TOKEN_SWAPPER_FUSE');
    });
  });

  describe('getMetadataType', () => {
    it('should return correct type for AUDIT_STATUS metadata', async () => {
      const AUDIT_STATUS_METADATA_ID = 0;

      const metadataType = await fuseWhitelist.getMetadataType(
        AUDIT_STATUS_METADATA_ID,
      );

      expect(metadataType).to.equal('AUDIT_STATUS');
    });
  });
});
