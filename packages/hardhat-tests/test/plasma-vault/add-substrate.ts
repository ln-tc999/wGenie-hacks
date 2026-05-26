import { base } from 'viem/chains';
import { expect } from 'chai';
import { PlasmaVault } from '@wgenie/fusion-sdk';
import { ANVIL_TEST_ACCOUNT } from '../../lib/test-accounts';
import { env } from '../../lib/env';
import { NetworkConnection } from 'hardhat/types/network';
import { after, before, describe, it } from 'node:test';
import { network } from 'hardhat';
import { Hex, pad } from 'viem';

describe('PlasmaVault - addSubstrates', () => {
  const BLOCK_NUMBER = 35740187;
  const PLASMA_VAULT = '0xc4c00d8b323f37527eeda27c87412378be9f68ec';
  const ATOMIST = '0xF6a9bd8F6DC537675D499Ac1CA14f2c55d8b5569';
  const NOT_ATOMIST = ANVIL_TEST_ACCOUNT[0].address;
  const USDT = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2';
  const USDT_SUBSTRATE = pad(USDT, { size: 32 }).toLowerCase() as Hex;
  const MARKET_ID_AAVE_V3 = 1n;

  let connection: NetworkConnection<'op'>;

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
  });

  after(async () => {
    await connection.close();
  });

  it('should add substrates to Plasma Vault by Atomist', async () => {
    const { viem } = connection;
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();
    const plasmaVault = await PlasmaVault.create(publicClient, PLASMA_VAULT);

    await testClient.request({
      method: 'hardhat_impersonateAccount',
      params: [ATOMIST],
    });
    const atomistClient = await viem.getWalletClient(ATOMIST);
    await testClient.setBalance({
      address: ATOMIST,
      value: BigInt(1e18),
    });

    const currentSubstrates =
      await plasmaVault.getMarketSubstrates(MARKET_ID_AAVE_V3);

    expect(currentSubstrates).to.deep.equal([
      '0x0000000000000000000000004200000000000000000000000000000000000006',
      '0x000000000000000000000000c1cba3fcea344f92d9239c08c0568f6f2f0ee452',
    ]);

    await plasmaVault.grantMarketSubstrates(atomistClient, MARKET_ID_AAVE_V3, [
      ...currentSubstrates,
      USDT_SUBSTRATE,
    ]);

    expect(
      await plasmaVault.getMarketSubstrates(MARKET_ID_AAVE_V3),
    ).to.deep.equal([...currentSubstrates, USDT_SUBSTRATE]);
  });
});
