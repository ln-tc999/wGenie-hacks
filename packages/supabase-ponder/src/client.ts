/**
 * Ponder Database Supabase Client
 *
 * Connects to the Ponder Supabase database using @supabase/supabase-js.
 * Uses PONDER_DB_* prefixed environment variables to avoid conflicts with other databases.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.PONDER_DB_SUPABASE_URL;
const supabaseKey = process.env.PONDER_DB_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Ponder Database credentials.\n' +
    'Please set PONDER_DB_SUPABASE_URL and PONDER_DB_SUPABASE_SERVICE_ROLE_KEY environment variables.\n\n' +
    'For local development:\n' +
    '  PONDER_DB_SUPABASE_URL=http://127.0.0.1:54341\n' +
    '  PONDER_DB_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>\n\n' +
    'See: packages/supabase-ponder/README.md for setup instructions.'
  );
}

/**
 * Supabase client for the Ponder database
 * Type-safe with auto-generated Database types
 * Uses service role key for server-side access (bypasses RLS)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Get the Ponder database connection details
 * Useful for debugging and logging
 */
export const getPonderDatabaseInfo = () => ({
  url: supabaseUrl,
  project: supabaseUrl?.includes('127.0.0.1')
    ? 'fusion-ponder-db (local)'
    : supabaseUrl?.replace('https://', '').replace('.supabase.co', '') || 'unknown',
});
