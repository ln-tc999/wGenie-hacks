import {
  Address,
  erc20Abi,
  erc4626Abi,
  Hex,
  PublicClient,
  WalletClient,
  stringToHex,
} from 'viem';
import { plasmaVaultAbi } from './abi/plasma-vault.abi';
import { fuseErrorsAbi } from './abi/fuse-errors.abi';
import { priceOracleMiddlewareAbi } from './abi/price-oracle-middleware.abi';
import { accessManagerAbi } from './abi/access-manager.abi';
import { feeManagerAbi } from './abi/fee-manager.abi';
import { feeAccountAbi } from './abi/fee-account.abi';
import { universalReaderPrehooksInfoAbi } from './abi/universal-reader-prehooks-info.abi';
import { fuseAbi } from './abi/fuse.abi';
import { to18 } from './utils/to18';
import { ONE_ETHER } from './utils/constants';
import { UNIVERSAL_READER_PREHOOKS_INFO_ADDRESSES } from './prehooks/prehooks.addresses';
import { FuseAction, ChainId } from './fusion.types';
import {
  ACCESS_MANAGER_ROLE,
  AccessManagerRole,
} from './access-manager/access-manager.types';
import { Prehook } from './prehooks/prehooks.types';
import { universalReaderBalanceFusesAbi } from './abi/universal-reader-balance-fuses.abi';
import {
  UNIVERSAL_READER_BALANCE_FUSES_ADDRESSES,
  ERC4626_ZAP_IN_WITH_NATIVE_TOKEN_ADDRESS,
} from './fusion.addresses';
import { rewardsClaimManagerAbi } from './abi/rewards-claim-manager.abi';
import {
  erc4626ZapInWithNativeTokenAbi,
  erc4626ZapInWithNativeTokenAndReferralCodeAbi,
} from './abi/erc4626-zap-in-with-native-token.abi';
import { ZapInPayload } from './zaps/zaps.types';

export class PlasmaVault {
  /**
   * @dev Private constructor is meant to be used only by the static create method.
   */
  private constructor(
    public readonly publicClient: PublicClient,
    public readonly chainId: ChainId,
    public readonly address: Address,
    public readonly assetAddress: Address,
    public readonly assetDecimals: number,
    public readonly priceOracle: Address,
  ) {}

  /**
   * Create a new PlasmaVault instance
   * @param publicClient - The public client to use.
   * @param plasmaVaultAddress - The address of the Plasma Vault.
   * @returns A new PlasmaVault instance.
   * @dev This is an async constructor.
   * @dev It's meant to make RPC calls to get the PlasmaVault's data, and PlasmaVault's asset data.
   */
  public static async create(
    publicClient: PublicClient,
    plasmaVaultAddress: Address,
  ): Promise<PlasmaVault> {
    const chainId = publicClient.chain?.id as ChainId;

    const multicallResults = await publicClient.multicall({
      contracts: [
        {
          address: plasmaVaultAddress,
          abi: erc4626Abi,
          functionName: 'asset',
        },
        {
          address: plasmaVaultAddress,
          abi: plasmaVaultAbi,
          functionName: 'getPriceOracleMiddleware',
        },
      ],
    });

    const [
      { result: assetAddress, error: assetError },
      { result: priceOracle, error: priceOracleError },
    ] = multicallResults;

    if (assetAddress === undefined) {
      throw new Error(
        `assetAddress is undefined. Error: ${assetError?.message || 'Unknown error'}`,
      );
    }
    if (priceOracle === undefined) {
      throw new Error(
        `priceOracle is undefined. Error: ${priceOracleError?.message || 'Unknown error'}`,
      );
    }

    const decimalsResult = await publicClient.multicall({
      contracts: [
        {
          address: assetAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        },
      ],
    });

    const [{ result: assetDecimals, error: decimalsError }] = decimalsResult;

    if (assetDecimals === undefined) {
      throw new Error(
        `assetDecimals is undefined. Error: ${decimalsError?.message || 'Unknown error'}`,
      );
    }

    return new PlasmaVault(
      publicClient,
      chainId,
      plasmaVaultAddress,
      assetAddress,
      assetDecimals,
      priceOracle,
    );
  }

  /**
   * Execute a list of Fuse Actions on the PlasmaVault
   * @param walletClient - Alpha wallet client.
   * @param executors - Fuse actions to execute. You can generate them using `transactions`.
   * @returns Transaction hash.
   * @dev This method is meant to interact with `fuses`.
   */
  public async execute(alphaClient: WalletClient, fuseActions: FuseAction[][]) {
    const { request } = await this.publicClient.simulateContract({
      account: alphaClient.account,
      address: this.address,
      abi: [
        ...plasmaVaultAbi,
        /**
         * @dev fuseErrorsAbi is needed to decode the error messages while executing fuses methods.
         */
        ...fuseErrorsAbi,
      ],
      functionName: 'execute',
      args: [fuseActions.flat()],
    });

    return await alphaClient.writeContract(request);
  }

  /**
   * Get the market ids of all the fuses or only the fuses of a specific type.
   * @returns Market ids of the fuses.
   */
  public async getMarketIds({
    include,
  }: {
    include?: Array<'fuses' | 'balanceFuses' | 'rewardsFuses'>;
  } = {}) {
    // if include is undefined, read all fuses
    const includeFuse = (
      fuseType: 'fuses' | 'balanceFuses' | 'rewardsFuses',
    ) => {
      if (include === undefined) return true;
      return include.includes(fuseType);
    };
    const fusesToRead = [
      ...(includeFuse('fuses') ? [this.getFuses()] : []),
      ...(includeFuse('balanceFuses') ? [this.getBalanceFuses()] : []),
      ...(includeFuse('rewardsFuses') ? [this.getRewardsFuses()] : []),
    ];

    const allFuses = (await Promise.all(fusesToRead)).flat();

    const allFusesMarketIds = await this.publicClient.multicall({
      contracts: allFuses.map((fuseAddress) => {
        return {
          address: fuseAddress,
          abi: fuseAbi,
          functionName: 'MARKET_ID',
        };
      }),
      allowFailure: false,
    });

    const uniqueMarketIds = Array.from(new Set(allFusesMarketIds));

    return uniqueMarketIds;
  }

  public async getMarketSubstrates(marketId: bigint) {
    const marketSubstrates = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getMarketSubstrates',
      args: [marketId],
    });

    return marketSubstrates;
  }

  public async getDependencyBalanceGraph(marketId: bigint) {
    const dependencies = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getDependencyBalanceGraph',
      args: [marketId],
    });

    return dependencies;
  }

  public async getAllDependencyBalanceGraphs({
    include,
  }: {
    include?: Array<'fuses' | 'balanceFuses' | 'rewardsFuses'>;
  } = {}) {
    const marketIds = await this.getMarketIds({ include });

    const dependenciesResults = await this.publicClient.multicall({
      contracts: marketIds.map(
        (marketId) =>
          ({
            address: this.address,
            abi: plasmaVaultAbi,
            functionName: 'getDependencyBalanceGraph',
            args: [marketId],
          }) as const,
      ),
      allowFailure: false,
    });

    const dependencies = dependenciesResults
      .map((dependencies, index) => {
        const marketId = marketIds[index];
        if (marketId === undefined) return undefined;
        return {
          marketId,
          dependencies,
        };
      })
      .filter((v) => v !== undefined);

    return dependencies;
  }

  public async updateDependencyBalanceGraph(
    fuseManagerClient: WalletClient,
    marketId: bigint,
    dependencies: bigint[],
  ) {
    const { request } = await this.publicClient.simulateContract({
      account: fuseManagerClient.account,
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'updateDependencyBalanceGraphs',
      args: [[marketId], [dependencies]],
    });

    await fuseManagerClient.writeContract(request);
  }

  public async getMarketId(fuseAddress: Address) {
    const marketId = await this.publicClient.readContract({
      address: fuseAddress,
      abi: fuseAbi,
      functionName: 'MARKET_ID',
    });

    return marketId;
  }

  /**
   * Get the total assets of the PlasmaVault
   * @returns Total assets of the PlasmaVault.
   * @dev We should always call `updateMarketsBalances` before to get the total assets with accrued interest in the markets.
   */
  public async getTotalAssets() {
    const marketIds = await this.getMarketIds();

    const result = await this.publicClient.multicall({
      contracts: [
        {
          address: this.address,
          abi: plasmaVaultAbi,
          functionName: 'updateMarketsBalances',
          args: [marketIds],
        },
        {
          address: this.address,
          abi: plasmaVaultAbi,
          functionName: 'totalAssets',
        },
      ],
    });

    if (!result?.[1].result) {
      throw new Error(
        `getTotalAssets: ${result?.[1].error?.message || result?.[0].error?.message}`,
      );
    }

    const totalAssets = result?.[1].result;

    return totalAssets;
  }

  /**
   * Get the USD price of an ERC20 token in 18 decimals.
   * @returns USD price of an ERC20 token in 18 decimals.
   */
  public async getErc20UsdPrice_18(erc20Address: Address) {
    const assetUsdPrice = await this.publicClient.readContract({
      address: this.priceOracle,
      abi: priceOracleMiddlewareAbi,
      functionName: 'getAssetPrice',
      args: [erc20Address],
    });
    const assetUsdPrice_18 = to18(assetUsdPrice[0], Number(assetUsdPrice[1]));

    return assetUsdPrice_18;
  }

  /**
   * Get the asset's USD price in 18 decimals.
   * @returns Asset's USD price in 18 decimals.
   */
  public async getAssetUsdPrice_18() {
    const assetUsdPrice_18 = await this.getErc20UsdPrice_18(this.assetAddress);

    return assetUsdPrice_18;
  }

  /**
   * Get the TVL of the PlasmaVault in USD in 18 decimals.
   * @returns TVL of the PlasmaVault in USD in 18 decimals.
   */
  public async getTvl() {
    const assetUsdPrice_18 = await this.getAssetUsdPrice_18();
    const totalAssets = await this.getTotalAssets();
    const totalAssets_18 = to18(totalAssets, this.assetDecimals);
    const tvl = (totalAssets_18 * assetUsdPrice_18) / ONE_ETHER;
    return tvl;
  }

  public async getErc20Balance(erc20Address: Address) {
    const erc20Balance = await this.publicClient.readContract({
      address: erc20Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [this.address],
    });

    return erc20Balance;
  }

  public async getAssetBalance() {
    return this.getErc20Balance(this.assetAddress);
  }

  public async getAccessManager() {
    const accessManager = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getAccessManagerAddress',
    });

    return accessManager;
  }

  public async hasRole(roleKey: AccessManagerRole, accountAddress: Address) {
    const accessManagerAddress = await this.getAccessManager();

    const [isMember, executionDelay] = await this.publicClient.readContract({
      address: accessManagerAddress,
      abi: accessManagerAbi,
      functionName: 'hasRole',
      args: [ACCESS_MANAGER_ROLE[roleKey].value, accountAddress],
    });

    return {
      isMember,
      executionDelay,
    };
  }

  public async getFuses() {
    const fuses = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getFuses',
    });

    return fuses;
  }

  public async getBalanceFuses() {
    const address = UNIVERSAL_READER_BALANCE_FUSES_ADDRESSES[this.chainId] as Address;

    const [_, balanceFuseAddresses] = await this.publicClient.readContract({
      address,
      abi: universalReaderBalanceFusesAbi,
      functionName: 'getBalanceFuseInfo',
      args: [this.address],
    });

    return balanceFuseAddresses;
  }

  public async getRewardsFuses() {
    const rewardsClaimManagerAddress =
      await this.getRewardsClaimManagerAddress();
    const rewardsFuses = await this.publicClient.readContract({
      address: rewardsClaimManagerAddress,
      abi: rewardsClaimManagerAbi,
      functionName: 'getRewardsFuses',
    });

    return rewardsFuses;
  }

  public async getInstantWithdrawalFuses() {
    const fuses = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getInstantWithdrawalFuses',
    });

    return fuses;
  }

  public async getInstantWithdrawalFusesParams(
    fuseAddress: Address,
    index: number,
  ) {
    const params = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getInstantWithdrawalFusesParams',
      args: [fuseAddress, BigInt(index)],
    });

    return params;
  }

  public async addFuses(
    fuseManagerClient: WalletClient,
    fuseAddresses: Address[],
  ) {
    await this.assertRole(fuseManagerClient, 'FUSE_MANAGER_ROLE');

    const { request } = await this.publicClient.simulateContract({
      account: fuseManagerClient.account,
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'addFuses',
      args: [fuseAddresses],
    });

    await fuseManagerClient.writeContract(request);
  }

  public async removeFuses(
    fuseManagerClient: WalletClient,
    fuseAddresses: Address[],
  ) {
    await this.assertRole(fuseManagerClient, 'FUSE_MANAGER_ROLE');

    const { request } = await this.publicClient.simulateContract({
      account: fuseManagerClient.account,
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'removeFuses',
      args: [fuseAddresses],
    });

    await fuseManagerClient.writeContract(request);
  }

  public async addBalanceFuse(
    fuseManagerClient: WalletClient,
    fuseAddress: Address,
    marketId: bigint,
  ) {
    await this.assertRole(fuseManagerClient, 'FUSE_MANAGER_ROLE');

    const { request } = await this.publicClient.simulateContract({
      account: fuseManagerClient.account,
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'addBalanceFuse',
      args: [marketId, fuseAddress],
    });

    await fuseManagerClient.writeContract(request);
  }

  private async assertRole(
    walletClient: WalletClient,
    roleKey: AccessManagerRole,
  ) {
    const address = walletClient.account?.address;

    if (!address) {
      throw new Error('walletClient has no address');
    }

    const { isMember } = await this.hasRole(roleKey, address);

    if (!isMember) {
      throw new Error(`${address} does not have ${roleKey}`);
    }

    // TODO: check executionDelay
  }

  /**
   * Grant substrates to a market.
   * Required role: ATOMIST_ROLE
   * There is only one method to change the substrates of a market.
   * You have to always provide all the substrates for a market, not just the ones you want to add or remove.
   * @param atomistClient - Atomist wallet client.
   * @param marketId - Market id.
   * @param substrates - Substrates to grant bytes32 hex format.
   */
  public async grantMarketSubstrates(
    atomistClient: WalletClient,
    marketId: bigint,
    substrates: Hex[],
  ) {
    const { request } = await this.publicClient.simulateContract({
      account: atomistClient.account,
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'grantMarketSubstrates',
      args: [marketId, substrates],
    });

    await atomistClient.writeContract(request);
  }

  public async getPerformanceFeeData() {
    const performanceFeeData = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getPerformanceFeeData',
    });

    return performanceFeeData;
  }

  public async getManagementFeeData() {
    const managementFeeData = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getManagementFeeData',
    });

    return managementFeeData;
  }

  public async getPerformanceFeeManagerAddress() {
    const performanceFeeData = await this.getPerformanceFeeData();

    const performanceFeeManager = await this.publicClient.readContract({
      address: performanceFeeData.feeAccount,
      abi: feeAccountAbi,
      functionName: 'FEE_MANAGER',
    });

    return performanceFeeManager;
  }

  public async getManagementFeeManagerAddress() {
    const managementFeeData = await this.getManagementFeeData();

    const managementFeeManager = await this.publicClient.readContract({
      address: managementFeeData.feeAccount,
      abi: feeAccountAbi,
      functionName: 'FEE_MANAGER',
    });

    return managementFeeManager;
  }

  public async getTotalPerformanceFee() {
    const performanceFeeManagerAddress =
      await this.getPerformanceFeeManagerAddress();

    const totalPerformanceFee = await this.publicClient.readContract({
      address: performanceFeeManagerAddress,
      abi: feeManagerAbi,
      functionName: 'getTotalPerformanceFee',
    });

    return totalPerformanceFee;
  }

  public async getTotalManagementFee() {
    const managementFeeManagerAddress =
      await this.getManagementFeeManagerAddress();

    const totalManagementFee = await this.publicClient.readContract({
      address: managementFeeManagerAddress,
      abi: feeManagerAbi,
      functionName: 'getTotalManagementFee',
    });

    return totalManagementFee;
  }

  public async updatePerformanceFee(
    atomistClient: WalletClient,
    recipientFees: Array<{
      recipient: Address;
      feeValue: bigint;
    }>,
  ) {
    await this.assertRole(atomistClient, 'ATOMIST_ROLE');

    const performanceFeeManagerAddress =
      await this.getPerformanceFeeManagerAddress();

    const { request } = await this.publicClient.simulateContract({
      account: atomistClient.account,
      address: performanceFeeManagerAddress,
      /**
       * @dev feeAccountAbi, plasmaVaultAbi for error decoding
       */
      abi: [...feeManagerAbi, ...feeAccountAbi, ...plasmaVaultAbi],
      functionName: 'updatePerformanceFee',
      args: [recipientFees],
    });

    await atomistClient.writeContract(request);
  }

  public async updateManagementFee(
    atomistClient: WalletClient,
    recipientFees: Array<{
      recipient: Address;
      feeValue: bigint;
    }>,
  ) {
    await this.assertRole(atomistClient, 'ATOMIST_ROLE');

    const managementFeeManagerAddress =
      await this.getManagementFeeManagerAddress();

    const { request } = await this.publicClient.simulateContract({
      account: atomistClient.account,
      address: managementFeeManagerAddress,
      /**
       * @dev feeAccountAbi, plasmaVaultAbi for error decoding
       */
      abi: [...feeManagerAbi, ...feeAccountAbi, ...plasmaVaultAbi],
      functionName: 'updateManagementFee',
      args: [recipientFees],
    });

    await atomistClient.writeContract(request);
  }

  public async getPerformanceFeeRecipients() {
    const performanceFeeManagerAddress =
      await this.getPerformanceFeeManagerAddress();

    const performanceFeeRecipients = await this.publicClient.readContract({
      address: performanceFeeManagerAddress,
      abi: feeManagerAbi,
      functionName: 'getPerformanceFeeRecipients',
    });

    return performanceFeeRecipients;
  }

  public async getManagementFeeRecipients() {
    const managementFeeManagerAddress =
      await this.getManagementFeeManagerAddress();

    const managementFeeRecipients = await this.publicClient.readContract({
      address: managementFeeManagerAddress,
      abi: feeManagerAbi,
      functionName: 'getManagementFeeRecipients',
    });

    return managementFeeRecipients;
  }

  public async getwGenieDaoManagementFee() {
    const managementFeeManagerAddress =
      await this.getManagementFeeManagerAddress();

    const wGenieDaoManagementFee = await this.publicClient.readContract({
      address: managementFeeManagerAddress,
      abi: feeManagerAbi,
      functionName: 'wGenie_DAO_MANAGEMENT_FEE',
    });

    return wGenieDaoManagementFee;
  }

  public async getwGenieDaoPerformanceFee() {
    const performanceFeeManagerAddress =
      await this.getPerformanceFeeManagerAddress();

    const wGenieDaoPerformanceFee = await this.publicClient.readContract({
      address: performanceFeeManagerAddress,
      abi: feeManagerAbi,
      functionName: 'wGenie_DAO_PERFORMANCE_FEE',
    });

    return wGenieDaoPerformanceFee;
  }

  public async grantRole(
    roleManagerClient: WalletClient,
    roleValue: bigint,
    accountToGrantRole: Address,
    timelockSeconds: number,
  ) {
    const accessManagerAddress = await this.getAccessManager();

    const { request } = await this.publicClient.simulateContract({
      account: roleManagerClient.account,
      address: accessManagerAddress,
      abi: accessManagerAbi,
      functionName: 'grantRole',
      args: [roleValue, accountToGrantRole, timelockSeconds],
    });

    await roleManagerClient.writeContract(request);
  }

  public async getPrehooksInfo() {
    const address = UNIVERSAL_READER_PREHOOKS_INFO_ADDRESSES[this.chainId] as Address;

    const prehooksInfo = await this.publicClient.readContract({
      address,
      abi: universalReaderPrehooksInfoAbi,
      functionName: 'getPreHooksInfo',
      args: [this.address],
    });

    return prehooksInfo;
  }

  public async setPreHookImplementations(
    prehooksManagerClient: WalletClient,
    prehooks: Prehook[],
  ) {
    await this.assertRole(prehooksManagerClient, 'PRE_HOOKS_MANAGER_ROLE');

    const selectors = prehooks.map((prehook) => prehook.selector);
    const implementations = prehooks.map((prehook) => prehook.implementation);
    const substrates = prehooks.map((prehook) => prehook.substrates);

    const { request } = await this.publicClient.simulateContract({
      account: prehooksManagerClient.account,
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'setPreHookImplementations',
      args: [selectors, implementations, substrates],
    });

    await prehooksManagerClient.writeContract(request);
  }

  public async getRewardsClaimManagerAddress() {
    const rewardsClaimManagerAddress = await this.publicClient.readContract({
      address: this.address,
      abi: plasmaVaultAbi,
      functionName: 'getRewardsClaimManagerAddress',
    });

    return rewardsClaimManagerAddress;
  }

  /**
   * Execute a zap in operation to deposit assets into the PlasmaVault
   * @param walletClient - User wallet client
   * @param payload - Zap in payload containing tokenOutMinAmount, zapCalls, nativeTokenAmount, and assetsToRefundToSender
   * @param referralCode - Optional referral code (will be converted to bytes32)
   * @returns Transaction hash
   */
  public async zapIn(
    walletClient: WalletClient,
    payload: ZapInPayload,
    referralCode?: string,
  ) {
    const receiver = walletClient.account?.address;

    if (!receiver) {
      throw new Error('walletClient has no address');
    }

    const erc4626ZapInWithNativeTokenAddress =
      ERC4626_ZAP_IN_WITH_NATIVE_TOKEN_ADDRESS[this.chainId];

    if (!erc4626ZapInWithNativeTokenAddress) {
      throw new Error(
        `ERC4626 ZapIn contract not available on chain ${this.chainId}`,
      );
    }

    const baseArgs = {
      vault: this.address,
      receiver,
      minAmountToDeposit: payload.tokenOutMinAmount,
      assetsToRefundToSender: payload.assetsToRefundToSender,
      calls: payload.zapCalls,
    };

    if (referralCode) {
      const { request } = await this.publicClient.simulateContract({
        account: walletClient.account,
        address: erc4626ZapInWithNativeTokenAddress,
        abi: erc4626ZapInWithNativeTokenAndReferralCodeAbi,
        functionName: 'zapIn',
        args: [baseArgs, stringToHex(referralCode, { size: 32 })],
        value: payload.nativeTokenAmount,
      });

      return await walletClient.writeContract(request);
    }

    const { request } = await this.publicClient.simulateContract({
      account: walletClient.account,
      address: erc4626ZapInWithNativeTokenAddress,
      abi: erc4626ZapInWithNativeTokenAbi,
      functionName: 'zapIn',
      args: [baseArgs],
      value: payload.nativeTokenAmount,
    });

    return await walletClient.writeContract(request);
  }
}
