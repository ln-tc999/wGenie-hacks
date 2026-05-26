import type { StorybookConfig } from '@storybook/react-vite';
import { loadEnv, type Plugin } from 'vite';
import path from 'path';
import { startAnvilForks, stopAnvilForks } from './anvil-forks';

const isAnvilMode = process.env.STORYBOOK_ANVIL === 'true';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: ['../public'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Load all env vars (including non-VITE_ prefixed) from .env files
    const env = loadEnv('', path.resolve(__dirname, '..'), '');

    let rpcMainnet = env.NEXT_PUBLIC_RPC_URL_MAINNET ?? '';
    let rpcArbitrum = env.NEXT_PUBLIC_RPC_URL_ARBITRUM ?? '';
    let rpcBase = env.NEXT_PUBLIC_RPC_URL_BASE ?? '';

    const plugins: Plugin[] = [];

    if (isAnvilMode) {
      const anvilUrls = await startAnvilForks({
        NEXT_PUBLIC_RPC_URL_MAINNET: rpcMainnet,
        NEXT_PUBLIC_RPC_URL_ARBITRUM: rpcArbitrum,
        NEXT_PUBLIC_RPC_URL_BASE: rpcBase,
      });

      rpcMainnet = anvilUrls.NEXT_PUBLIC_RPC_URL_MAINNET;
      rpcArbitrum = anvilUrls.NEXT_PUBLIC_RPC_URL_ARBITRUM;
      rpcBase = anvilUrls.NEXT_PUBLIC_RPC_URL_BASE;

      // Cleanup plugin — kill Anvil when the dev server stops
      plugins.push({
        name: 'anvil-cleanup',
        configureServer(server) {
          const cleanup = () => {
            console.log('\n🔨 Stopping Anvil forks...');
            stopAnvilForks();
          };
          server.httpServer?.on('close', cleanup);
          process.on('SIGINT', () => {
            cleanup();
            process.exit(0);
          });
          process.on('SIGTERM', () => {
            cleanup();
            process.exit(0);
          });
        },
      });
    }

    return {
      ...config,
      plugins: [...(config.plugins ?? []), ...plugins],
      server: {
        ...config.server,
        proxy: {
          '/api': 'http://localhost:3000',
        },
      },
      define: {
        ...config.define,
        'import.meta.env.NEXT_PUBLIC_RPC_URL_MAINNET':
          JSON.stringify(rpcMainnet),
        'import.meta.env.NEXT_PUBLIC_RPC_URL_ARBITRUM':
          JSON.stringify(rpcArbitrum),
        'import.meta.env.NEXT_PUBLIC_RPC_URL_BASE': JSON.stringify(rpcBase),
        'import.meta.env.ALPHA_CONFIG_TEST_PRIVATE_KEY': JSON.stringify(
          env.ALPHA_CONFIG_TEST_PRIVATE_KEY ?? '',
        ),
        // Polyfill process.env for modules that use Next.js conventions (e.g., wagmi-provider.tsx)
        'process.env.NEXT_PUBLIC_RPC_URL_MAINNET': JSON.stringify(rpcMainnet),
        'process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM': JSON.stringify(rpcArbitrum),
        'process.env.NEXT_PUBLIC_RPC_URL_BASE': JSON.stringify(rpcBase),
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': path.resolve(__dirname, '../src'),
        },
      },
    };
  },
};

export default config;
