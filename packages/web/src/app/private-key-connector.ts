import {
  type Address,
  type EIP1193RequestFn,
  type Hex,
  type TransactionRequest,
  custom,
  fromHex,
  getAddress,
  numberToHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { rpc } from 'viem/utils';
import { createConnector } from 'wagmi';

interface PrivateKeyConnectorParameters {
  privateKey: Hex;
  /** Custom RPC URLs keyed by chain ID — used instead of chain defaults */
  rpcUrls?: Record<number, string>;
}

privateKeyConnector.type = 'private-key' as const;

export function privateKeyConnector({
  privateKey,
  rpcUrls,
}: PrivateKeyConnectorParameters) {
  const account = privateKeyToAccount(privateKey);
  let connected = true;
  let connectedChainId: number;

  return createConnector((config) => ({
    id: 'private-key',
    name: 'Private Key Connector',
    type: privateKeyConnector.type,

    async setup() {
      connectedChainId = config.chains[0].id;
    },

    async connect({ chainId } = {}) {
      if (chainId) connectedChainId = chainId;
      connected = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- wagmi v3.4 withCapabilities generic
      return { accounts: [account.address], chainId: connectedChainId } as any;
    },

    async disconnect() {
      connected = false;
    },

    async getAccounts() {
      return [account.address];
    },

    async getChainId() {
      return connectedChainId;
    },

    async isAuthorized() {
      return connected;
    },

    async switchChain({ chainId }) {
      const chain = config.chains.find((x) => x.id === chainId);
      if (!chain) throw new Error(`Chain ${chainId} not configured`);
      connectedChainId = chainId;
      this.onChainChanged(chainId.toString());
      return chain;
    },

    onAccountsChanged(accounts) {
      config.emitter.emit('change', {
        accounts: accounts.map((x) => getAddress(x)),
      });
    },

    onChainChanged(chain) {
      config.emitter.emit('change', { chainId: Number(chain) });
    },

    async onDisconnect() {
      config.emitter.emit('disconnect');
      connected = false;
    },

    async getProvider({ chainId } = {}) {
      const chain =
        config.chains.find((x) => x.id === chainId) ?? config.chains[0];
      const url = rpcUrls?.[chain.id] ?? chain.rpcUrls.default.http[0]!;

      const request: EIP1193RequestFn = async ({ method, params }) => {
        if (method === 'eth_chainId') return numberToHex(connectedChainId);
        if (method === 'eth_requestAccounts') return [account.address];
        if (method === 'eth_accounts') return [account.address];

        // Local signing using private key account
        if (method === 'personal_sign') {
          const [data] = params as [Hex, Address];
          return account.signMessage({ message: { raw: data } });
        }

        if (method === 'eth_signTypedData_v4') {
          const [, typedData] = params as [Address, string];
          const parsed = JSON.parse(typedData);
          return account.signTypedData(parsed);
        }

        // Chain switching
        if (method === 'wallet_switchEthereumChain') {
          type Params = [{ chainId: Hex }];
          connectedChainId = fromHex((params as Params)[0].chainId, 'number');
          this.onChainChanged(connectedChainId.toString());
          return;
        }

        // Local signing for eth_sendTransaction — sign locally, send raw
        if (method === 'eth_sendTransaction') {
          const [txParams] = params as [TransactionRequest];

          // Get nonce if not provided
          let nonce = txParams.nonce;
          if (nonce === undefined) {
            const { result: nonceHex } = await rpc.http(url, {
              body: {
                method: 'eth_getTransactionCount',
                params: [account.address, 'pending'],
              },
            });
            nonce = Number(nonceHex);
          }

          // Get gas estimate if not provided
          let gas = txParams.gas;
          if (!gas) {
            const { result: gasHex, error: gasErr } = await rpc.http(url, {
              body: { method: 'eth_estimateGas', params: [txParams] },
            });
            if (gasErr) throw gasErr;
            gas = BigInt(gasHex as string);
          }

          // Get current fees
          const { result: feeHex } = await rpc.http(url, {
            body: { method: 'eth_gasPrice', params: [] },
          });
          const gasPrice = BigInt(feeHex as string);

          const signedTx = await account.signTransaction({
            to: txParams.to as Address,
            data: txParams.data as Hex,
            value: txParams.value ? BigInt(txParams.value) : 0n,
            nonce: Number(nonce),
            gas: BigInt(gas),
            maxFeePerGas: (gasPrice * 120n) / 100n,
            maxPriorityFeePerGas: gasPrice / 10n,
            chainId: connectedChainId,
            type: 'eip1559',
          });

          const { error: sendErr, result: txHash } = await rpc.http(url, {
            body: {
              method: 'eth_sendRawTransaction',
              params: [signedTx],
            },
          });
          if (sendErr) throw sendErr;
          return txHash;
        }

        // Delegate all other calls to RPC
        const body = { method, params };
        const { error, result } = await rpc.http(url, { body });
        if (error) throw error;
        return result;
      };

      return custom({ request })({ retryCount: 0 });
    },
  }));
}
