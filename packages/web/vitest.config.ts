/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {
      NEXT_PUBLIC_RPC_URL_MAINNET: JSON.stringify(
        process.env.NEXT_PUBLIC_RPC_URL_MAINNET || ''
      ),
      NEXT_PUBLIC_RPC_URL_ARBITRUM: JSON.stringify(
        process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM || ''
      ),
      NEXT_PUBLIC_RPC_URL_BASE: JSON.stringify(
        process.env.NEXT_PUBLIC_RPC_URL_BASE || ''
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
