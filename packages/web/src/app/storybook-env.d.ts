/** Vite env types for Storybook files that use import.meta.env */
interface ImportMetaEnv {
  readonly ALPHA_CONFIG_TEST_PRIVATE_KEY?: string;
  readonly NEXT_PUBLIC_RPC_URL_MAINNET?: string;
  readonly NEXT_PUBLIC_RPC_URL_ARBITRUM?: string;
  readonly NEXT_PUBLIC_RPC_URL_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
