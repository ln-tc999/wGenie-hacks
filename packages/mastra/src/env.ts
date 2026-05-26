import { z } from 'zod';

/**
 * Environment variables schema for Mastra package
 *
 * Validates required environment variables at startup.
 * If validation fails, the application will throw a descriptive error.
 */
const envSchema = z.object({
  /**
   * Fusion Ponder PostgreSQL database connection URL
   * Used by SQL Agent tools for database introspection and querying
   *
   * Example: postgresql://postgres:postgres@127.0.0.1:54342/postgres
   */
  PONDER_DATABASE_URL: z
    .string()
    .url('PONDER_DATABASE_URL must be a valid PostgreSQL connection URL')
    .optional(),

  /**
   * Model to use for agents
   * Defaults to 'openrouter/anthropic/claude-haiku-4.5' (Claude Haiku 4.5)
   * This model handles parallel tool calls excellently
   */
  MODEL: z.string().optional().default('openrouter/anthropic/claude-haiku-4.5'),

  /**
   * RPC URLs for blockchain connections
   * Used by Plasma Vault Agent tools for on-chain data fetching
   */
  ETHEREUM_RPC_URL: z.string().url().optional(),
  ARBITRUM_RPC_URL: z.string().url().optional(),
  BASE_RPC_URL: z.string().url().optional(),

  /**
   * Turso remote LibSQL URL (required for Vercel deployment)
   * Falls back to file:./mastra.db for local development
   * Example: libsql://your-db-name.turso.io
   */
  TURSO_DATABASE_URL: z.string().optional(),

  /**
   * Turso auth token (required when TURSO_DATABASE_URL is set)
   */
  TURSO_AUTH_TOKEN: z.string().optional(),

  /**
   * Tenderly Virtual TestNet Admin RPC URLs
   * Pre-created long-lived Virtual TestNets (one per chain) for fork simulation.
   * Must be Admin RPC URLs (not Public RPC) to support impersonation and state overrides.
   */
  TENDERLY_RPC_URL_ETHEREUM: z.string().url().optional(),
  TENDERLY_RPC_URL_ARBITRUM: z.string().url().optional(),
  TENDERLY_RPC_URL_BASE: z.string().url().optional(),

  /**
   * API key for authenticating requests to the Mastra server
   * Must match the key sent by the Next.js web app in the X-API-Key header
   */
  MASTRA_API_KEY: z.string().min(1, 'MASTRA_API_KEY is required for API protection'),
});

/**
 * Validated environment variables
 *
 * @throws {ZodError} If required environment variables are missing or invalid
 */
export const env = envSchema.parse(process.env);

/**
 * Fusion Ponder database connection string
 * Pre-validated PostgreSQL connection URL for the Fusion blockchain indexing database
 */
export const FUSION_PONDER_CONNECTION_STRING = env.PONDER_DATABASE_URL ?? '';

/**
 * RPC URL configuration by chain ID
 */
export const RPC_URLS: Record<number, string | undefined> = {
  1: env.ETHEREUM_RPC_URL, // Ethereum Mainnet
  42161: env.ARBITRUM_RPC_URL, // Arbitrum One
  8453: env.BASE_RPC_URL, // Base
};

/**
 * Tenderly Virtual TestNet Admin RPC URLs by chain ID
 */
export const TENDERLY_RPC_URLS: Record<number, string | undefined> = {
  1: env.TENDERLY_RPC_URL_ETHEREUM,
  42161: env.TENDERLY_RPC_URL_ARBITRUM,
  8453: env.TENDERLY_RPC_URL_BASE,
};
