import { before, describe, it, after } from 'node:test';
import { expect } from 'chai';
import {
  PlasmaVault,
  cloneVault,
  grantRoles,
  addFuses,
  addBalanceFuses,
  configureSubstrates,
  updateDependencyGraphs,
  // ABIs for test-specific operations (deposit, allocate, swap, etc.)
  yoErc4626SupplyFuseAbi,
  yoRedeemFuseAbi,
  swapRouter02Abi,
  yoUniversalTokenSwapperFuseAbi,
  // Addresses for test-specific operations
  ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS,
  ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS,
  UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS,
  YO_REDEEM_FUSE_SLOT1_ADDRESS,
  UNISWAP_SWAP_ROUTER_02_ADDRESS,
  SWAP_EXECUTOR_ADDRESS,
  YO_USD_ADDRESS,
  YO_ETH_ADDRESS,
  YO_USDC_ADDRESS,
  YO_WETH_ADDRESS,
} from '@wgenie/fusion-sdk';
import { NetworkConnection } from 'hardhat/types/network';
import { network } from 'hardhat';
import { env } from '../../lib/env';
import { ANVIL_TEST_ACCOUNT } from '../../lib/test-accounts';
import { base } from 'viem/chains';
import {
  pad,
  erc20Abi,
  erc4626Abi,
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  toHex,
  type Address,
  type Hex,
} from 'viem';

// Note: YoRedeemFuse instances are deployed on Base mainnet:
// Slot1 (yoUSD): 0x6f7248f6d057e5f775a2608a71e1b0050b1adb95
// Slot2 (yoETH): 0xaebd1bab51368b0382a3f963468cab3edc524e5d
// Slot3 (yoBTC): 0x5760089c08a2b805760f0f86e867bffa9543aa41
// Slot4 (yoEUR): 0x7CB5E0e8083392EdEB4AaF68838215A3dD1831e5

import '@nomicfoundation/hardhat-toolbox-viem';

describe(
  'YO Treasury - vault creation and allocation lifecycle',
  { timeout: 180_000 },
  () => {
    const BLOCK_NUMBER = 42988200;
    const CHAIN_ID = base.id;
    const OWNER_ADDRESS = ANVIL_TEST_ACCOUNT[0].address;
    const EXECUTOR_ADDRESS = SWAP_EXECUTOR_ADDRESS[CHAIN_ID]!;

    let connection: NetworkConnection<'op'>;
    let vaultAddress: Address;
    let plasmaVault: PlasmaVault;
    let publicClient: Awaited<ReturnType<NetworkConnection<'op'>['viem']['getPublicClient']>>;
    let testClient: Awaited<ReturnType<NetworkConnection<'op'>['viem']['getTestClient']>>;
    let ownerClient: Awaited<ReturnType<NetworkConnection<'op'>['viem']['getWalletClient']>>;

    const usdcAddress = YO_USDC_ADDRESS[CHAIN_ID];
    const yoUsdAddress = YO_USD_ADDRESS[CHAIN_ID];
    const wethAddress = YO_WETH_ADDRESS[CHAIN_ID];
    const yoEthAddress = YO_ETH_ADDRESS[CHAIN_ID];

    before(async () => {
      connection = await network.connect({
        network: 'hardhatBase',
        chainType: 'op',
        override: {
          chainId: CHAIN_ID,
          forking: {
            url: env.RPC_URL_BASE,
            blockNumber: BLOCK_NUMBER,
          },
        },
      });

      const { viem } = connection;
      publicClient = await viem.getPublicClient();
      testClient = await viem.getTestClient();

      // Fund owner with ETH for gas
      await testClient.setBalance({
        address: OWNER_ADDRESS,
        value: BigInt(10e18),
      });

      ownerClient = await viem.getWalletClient(OWNER_ADDRESS);

      // ─── Vault creation via SDK library ───

      // Step 1: Clone vault
      const result = await cloneVault(publicClient, ownerClient, {
        chainId: CHAIN_ID,
        ownerAddress: OWNER_ADDRESS,
        vaultName: 'YO Treasury Test',
        vaultSymbol: 'yoTEST',
      });
      vaultAddress = result.vaultAddress;
      plasmaVault = result.plasmaVault;
      console.log('Vault created:', vaultAddress);

      // Step 2: Grant roles
      await grantRoles(ownerClient, plasmaVault, OWNER_ADDRESS);
      console.log('Roles granted');

      // Step 3: Add fuses (4 supply + 4 YoRedeemFuse + 1 swap = 9 fuses)
      await addFuses(ownerClient, plasmaVault, CHAIN_ID);
      console.log('Fuses added (including deployed YoRedeemFuse instances)');

      // Step 4: Add balance fuses (including ZeroBalanceFuse for swap market)
      await addBalanceFuses(ownerClient, plasmaVault, CHAIN_ID);
      console.log('Balance fuses added (including ZeroBalanceFuse for swap market)');

      // Step 5: Configure substrates
      await configureSubstrates(ownerClient, plasmaVault, CHAIN_ID);
      console.log('Substrates configured');

      // Step 6: Update dependency graphs
      await updateDependencyGraphs(ownerClient, plasmaVault);
      console.log('Dependency graphs updated');

      // ─── Test-specific setup: Fund owner with USDC and deposit ───

      const depositAmount = 100_000000n; // 100 USDC

      // Deal USDC via storage manipulation (FiatTokenV2 balances mapping at slot 9)
      const balanceSlot = keccak256(
        encodeAbiParameters(
          [{ type: 'address' }, { type: 'uint256' }],
          [OWNER_ADDRESS, 9n],
        ),
      );

      await testClient.setStorageAt({
        address: usdcAddress,
        index: balanceSlot,
        value: pad(toHex(depositAmount), { size: 32 }),
      });

      // Approve and deposit
      await ownerClient.writeContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [vaultAddress, depositAmount],
      });

      await ownerClient.writeContract({
        address: vaultAddress,
        abi: erc4626Abi,
        functionName: 'deposit',
        args: [depositAmount, OWNER_ADDRESS],
      });

      console.log('Deposited', depositAmount, 'USDC into vault');

      // ─── Allocate 50 USDC to yoUSD ───

      const allocateAmount = 50_000000n; // 50 USDC
      const supplyFuseSlot1 = ERC4626_SUPPLY_FUSE_SLOT1_ADDRESS[CHAIN_ID];

      const enterAction = {
        fuse: supplyFuseSlot1,
        data: encodeFunctionData({
          abi: yoErc4626SupplyFuseAbi,
          functionName: 'enter',
          args: [{ vault: yoUsdAddress, vaultAssetAmount: allocateAmount }],
        }),
      };

      await plasmaVault.execute(ownerClient, [[enterAction]]);
      console.log('Allocated 50 USDC to yoUSD');

      // YoRedeemFuse instances are now deployed on Base and included in addFuses()
    });

    after(async () => {
      await connection.close();
    });

    // ─── Verify initial state ───

    it('should have vault with yoUSD allocation', async () => {
      // Vault holds 50 USDC (100 deposited - 50 allocated)
      const vaultUsdc = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(vaultUsdc).to.equal(50_000000n);
      console.log('Vault USDC:', vaultUsdc);

      // Vault holds yoUSD shares
      const yoUsdShares = await publicClient.readContract({
        address: yoUsdAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(yoUsdShares > 0n).to.equal(true);
      console.log('Vault yoUSD shares:', yoUsdShares);

      // yoUSD shares are worth approximately 50 USDC
      const shareValue = await publicClient.readContract({
        address: yoUsdAddress,
        abi: erc4626Abi,
        functionName: 'convertToAssets',
        args: [yoUsdShares],
      });
      expect(shareValue > 49_000000n).to.equal(true);
      console.log('yoUSD shares worth:', shareValue, 'USDC');
    });

    // ─── Phase 1: Withdraw from yoUSD via YoRedeemFuse ───

    it('should withdraw from yoUSD via YoRedeemFuse', async () => {
      // Read vault's yoUSD share balance
      const yoUsdShares = await publicClient.readContract({
        address: yoUsdAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(yoUsdShares > 0n).to.equal(true);

      // Record USDC balance before
      const vaultUsdcBefore = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });

      // Build fuse exit action — runs via delegatecall from PlasmaVault
      // so address(this) = PlasmaVault = share owner, satisfying YoVault's owner check
      const exitAction = {
        fuse: YO_REDEEM_FUSE_SLOT1_ADDRESS[CHAIN_ID],
        data: encodeFunctionData({
          abi: yoRedeemFuseAbi,
          functionName: 'exit',
          args: [{ vault: yoUsdAddress, shares: yoUsdShares }],
        }),
      };

      await plasmaVault.execute(ownerClient, [[exitAction]]);

      // Verify yoUSD shares burned
      const yoUsdSharesAfter = await publicClient.readContract({
        address: yoUsdAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(yoUsdSharesAfter).to.equal(0n);

      // Verify USDC returned to vault
      const vaultUsdcAfter = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(vaultUsdcAfter > vaultUsdcBefore).to.equal(true);
      console.log('Withdrew from yoUSD:', vaultUsdcAfter - vaultUsdcBefore, 'USDC returned');
      console.log('Vault USDC after withdraw:', vaultUsdcAfter);
    });

    // ─── Phase 2: Swap USDC → WETH via UniversalTokenSwapperFuse ───

    it('should swap USDC to WETH via UniversalTokenSwapperFuse', async () => {
      const swapRouter02Address = UNISWAP_SWAP_ROUTER_02_ADDRESS[CHAIN_ID];
      const swapFuseAddress = UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[CHAIN_ID];
      const swapAmount = 10_000000n; // 10 USDC

      // ─── Encode swap calldata ───
      // Step 1: USDC.approve(SwapRouter02, amount) — executor approves router
      // Step 2: SwapRouter02.exactInputSingle({...}) — router pulls USDC, sends WETH
      const targets: Address[] = [usdcAddress, swapRouter02Address];
      const swapData: Hex[] = [
        encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [swapRouter02Address, swapAmount],
        }),
        encodeFunctionData({
          abi: swapRouter02Abi,
          functionName: 'exactInputSingle',
          args: [
            {
              tokenIn: usdcAddress,
              tokenOut: wethAddress,
              fee: 500, // 0.05% pool
              recipient: EXECUTOR_ADDRESS, // executor receives WETH, sweeps back to vault
              amountIn: swapAmount,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n,
            },
          ],
        }),
      ];

      // ─── Build FuseAction ───
      const fuseCalldata = encodeFunctionData({
        abi: yoUniversalTokenSwapperFuseAbi,
        functionName: 'enter',
        args: [
          {
            tokenIn: usdcAddress,
            tokenOut: wethAddress,
            amountIn: swapAmount,
            data: { targets, data: swapData },
          },
        ],
      });

      const swapAction = {
        fuse: swapFuseAddress,
        data: fuseCalldata,
      };

      // Record balances before
      const vaultUsdcBefore = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });

      // ─── Execute swap via fuse ───
      await plasmaVault.execute(ownerClient, [[swapAction]]);

      // Verify USDC decreased
      const vaultUsdcAfter = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(vaultUsdcAfter).to.equal(vaultUsdcBefore - swapAmount);

      // Verify WETH received
      const vaultWethBalance = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(vaultWethBalance > 0n).to.equal(true);
      console.log('Swapped', swapAmount, 'USDC →', vaultWethBalance, 'WETH');
    });

    // ─── Phase 3: Allocate WETH to yoETH ───

    it('should allocate WETH to yoETH', async () => {
      const supplyFuseSlot2 = ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS[CHAIN_ID];

      // Read available WETH
      const wethBalance = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(wethBalance > 0n).to.equal(true);

      // ─── Allocate all WETH to yoETH ───
      const enterAction = {
        fuse: supplyFuseSlot2,
        data: encodeFunctionData({
          abi: yoErc4626SupplyFuseAbi,
          functionName: 'enter',
          args: [{ vault: yoEthAddress, vaultAssetAmount: wethBalance }],
        }),
      };

      await plasmaVault.execute(ownerClient, [[enterAction]]);

      // Verify yoETH shares > 0
      const yoEthShares = await publicClient.readContract({
        address: yoEthAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(yoEthShares > 0n).to.equal(true);

      // Verify WETH balance is 0 (all allocated)
      const wethAfter = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(wethAfter).to.equal(0n);

      console.log('Allocated', wethBalance, 'WETH → yoETH shares:', yoEthShares);
    });

    // ─── Phase 4: Compound swap+allocate in single execute ───

    it('should compound swap+allocate in single execute', async () => {
      const swapRouter02Address = UNISWAP_SWAP_ROUTER_02_ADDRESS[CHAIN_ID];
      const swapFuseAddress = UNIVERSAL_TOKEN_SWAPPER_FUSE_ADDRESS[CHAIN_ID];
      const supplyFuseSlot2 = ERC4626_SUPPLY_FUSE_SLOT2_ADDRESS[CHAIN_ID];

      // Use remaining USDC in vault
      const vaultUsdc = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(vaultUsdc > 0n).to.equal(true);
      const swapAmount = vaultUsdc; // swap all remaining USDC

      // Record yoETH shares before
      const yoEthSharesBefore = await publicClient.readContract({
        address: yoEthAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });

      // ─── Action 1: Swap USDC → WETH ───
      const swapAction = {
        fuse: swapFuseAddress,
        data: encodeFunctionData({
          abi: yoUniversalTokenSwapperFuseAbi,
          functionName: 'enter',
          args: [
            {
              tokenIn: usdcAddress,
              tokenOut: wethAddress,
              amountIn: swapAmount,
              data: {
                targets: [usdcAddress, swapRouter02Address] as Address[],
                data: [
                  encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [swapRouter02Address, swapAmount],
                  }),
                  encodeFunctionData({
                    abi: swapRouter02Abi,
                    functionName: 'exactInputSingle',
                    args: [
                      {
                        tokenIn: usdcAddress,
                        tokenOut: wethAddress,
                        fee: 500,
                        recipient: EXECUTOR_ADDRESS,
                        amountIn: swapAmount,
                        amountOutMinimum: 0n,
                        sqrtPriceLimitX96: 0n,
                      },
                    ],
                  }),
                ] as Hex[],
              },
            },
          ],
        }),
      };

      // ─── Action 2: Allocate ALL WETH to yoETH ───
      // Use max uint256 — the ERC4626 deposit will cap at available balance
      const allocateAction = {
        fuse: supplyFuseSlot2,
        data: encodeFunctionData({
          abi: yoErc4626SupplyFuseAbi,
          functionName: 'enter',
          args: [
            {
              vault: yoEthAddress,
              vaultAssetAmount: BigInt(
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
              ),
            },
          ],
        }),
      };

      // ─── Execute both actions atomically ───
      // Each FuseAction[] in the outer array runs sequentially
      await plasmaVault.execute(ownerClient, [[swapAction], [allocateAction]]);

      // Verify: no USDC remaining
      const usdcAfter = await publicClient.readContract({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(usdcAfter).to.equal(0n);

      // Verify: no WETH remaining (all went to yoETH)
      const wethAfter = await publicClient.readContract({
        address: wethAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(wethAfter).to.equal(0n);

      // Verify: yoETH shares increased
      const yoEthSharesAfter = await publicClient.readContract({
        address: yoEthAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [vaultAddress],
      });
      expect(yoEthSharesAfter > yoEthSharesBefore).to.equal(true);

      console.log(
        'Compound swap+allocate:',
        swapAmount,
        'USDC → yoETH shares:',
        yoEthSharesAfter,
        '(was',
        yoEthSharesBefore,
        ')',
      );
    });
  },
);
