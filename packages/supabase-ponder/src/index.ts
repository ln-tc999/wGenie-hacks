/**
 * Ponder Database - Supabase Client
 *
 * This package provides the Supabase client for the PONDER database,
 * which stores all blockchain indexed data:
 * - Transfer events
 * - Deposit events
 * - Withdraw events
 * - Vault metrics and aggregations (buckets)
 * - Depositor information
 *
 * This is SEPARATE from other Supabase databases (e.g., Mastra).
 *
 * @example
 * ```ts
 * import { supabase } from '@wgenie/fusion-supabase-ponder';
 *
 * const { data } = await supabase.from('deposit_event').select('*').limit(10);
 * ```
 */

export { supabase, getPonderDatabaseInfo } from './client';
export type { Database } from './types';
