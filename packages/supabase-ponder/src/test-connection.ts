/**
 * Test script for Ponder Database connection
 *
 * Usage: pnpm --filter @wgenie/fusion-supabase-ponder test
 */

import 'dotenv/config';
import { supabase, getPonderDatabaseInfo } from './client';

async function testConnection() {
  console.log('Testing Ponder Database Connection (Supabase)\n');
  console.log('='.repeat(50));

  const info = getPonderDatabaseInfo();
  console.log(`\nPonder Database: ${info.project}`);
  console.log(`URL: ${info.url}\n`);

  const tables = [
    'deposit_event',
    'withdrawal_event',
    'transfer_event',
    'depositor',
    'deposit_buckets_2_hours',
    'deposit_buckets_8_hours',
    'deposit_buckets_1_day',
    'deposit_buckets_4_days',
    'withdraw_buckets_2_hours',
    'withdraw_buckets_8_hours',
    'withdraw_buckets_1_day',
    'withdraw_buckets_4_days',
  ] as const;

  console.log('Checking tables...\n');

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`   x ${table}: ${error.message}`);
    } else {
      console.log(`   ok ${table}: ${data.length} rows returned`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Ponder Database connection test complete!');
  console.log('='.repeat(50));
}

testConnection().catch(console.error);
