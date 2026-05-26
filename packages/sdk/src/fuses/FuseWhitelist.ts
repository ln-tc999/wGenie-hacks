import { Address, PublicClient } from 'viem';
import { fuseWhitelistAbi } from '../abi/fuse-whitelist.abi';
import { ChainId } from '../fusion.types';
import { zipWith } from 'remeda';

export class FuseWhitelist {
  /**
   * @dev Private constructor is meant to be used only by the static create method.
   */
  private constructor(
    public readonly publicClient: PublicClient,
    public readonly chainId: ChainId,
    public readonly address: Address,
  ) {}

  /**
   * Create a new Fuse Whitelist instance
   * @param publicClient - The public client to use.
   * @param whitelistAddress - The address of the Fuse Whitelist.
   * @returns A new Fuse Whitelist instance.
   * @dev This is an async constructor.
   * @dev It's meant to make RPC calls to get the Fuse Whitelist's immutable data.
   */
  public static async create(
    publicClient: PublicClient,
    whitelistAddress: Address,
  ): Promise<FuseWhitelist> {
    const chainId = publicClient.chain?.id as ChainId;

    return new FuseWhitelist(publicClient, chainId, whitelistAddress);
  }

  /**
   * Get all fuse types
   */
  async getFuseTypes() {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFuseTypes',
      args: [],
    });

    const zipped = zipWith(result[0], result[1], (id, name) => ({ id, name }));

    return zipped;
  }

  /**
   * Get all fuse states
   */
  async getFuseStates() {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFuseStates',
      args: [],
    });

    const zipped = zipWith(result[0], result[1], (id, name) => ({ id, name }));

    return zipped;
  }

  /**
   * Get all metadata types
   */
  async getMetadataTypes() {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getMetadataTypes',
      args: [],
    });

    const zipped = zipWith(result[0], result[1], (id, type) => ({ id, type }));

    return zipped;
  }

  /**
   * Get fuses by type ID
   */
  async getFusesByType(fuseTypeId: number) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFusesByType',
      args: [fuseTypeId],
    });
    return result;
  }

  /**
   * Get fuses by market ID
   */
  async getFusesByMarketId(marketId: bigint) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFusesByMarketId',
      args: [marketId],
    });
    return result;
  }

  /**
   * Get fuses by type, market ID and status
   */
  async getFusesByTypeAndMarketIdAndStatus(
    type: number,
    marketId: bigint,
    status: number,
  ) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFusesByTypeAndMarketIdAndStatus',
      args: [type, marketId, status],
    });
    return result;
  }

  /**
   * Get fuse information by address
   */
  async getFuseByAddress(fuseAddress: Address) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFuseByAddress',
      args: [fuseAddress],
    });

    return {
      fuseState: result[0],
      fuseType: result[1],
      fuseAddress: result[2],
      timestamp: result[3],
    };
  }

  /**
   * Get fuse state name by ID
   */
  async getFuseStateName(fuseStateId: number) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFuseStateName',
      args: [fuseStateId],
    });
    return result;
  }

  /**
   * Get fuse type description by ID
   */
  async getFuseTypeDescription(fuseTypeId: number) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getFuseTypeDescription',
      args: [fuseTypeId],
    });
    return result;
  }

  /**
   * Get metadata type by ID
   */
  async getMetadataType(metadataId: number) {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: fuseWhitelistAbi,
      functionName: 'getMetadataType',
      args: [metadataId],
    });
    return result;
  }
}
