import { PostgresStore } from '@mastra/pg';

/**
 * Mastra Storage Configuration
 *
 * Uses a SEPARATE Supabase database dedicated to Mastra's internal data:
 * - Agent memory
 * - Workflow state
 * - Thread history
 * - Observability traces
 *
 * This is isolated from other databases to keep concerns separated
 * and allow independent scaling.
 */

// Default to local Supabase instance on port 54352 (fusion-mastra project)
const DEFAULT_LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54352/postgres';

const connectionString = process.env.MASTRA_DATABASE_URL || DEFAULT_LOCAL_DATABASE_URL;

export const storage = new PostgresStore({
  connectionString,
});

export { connectionString };
