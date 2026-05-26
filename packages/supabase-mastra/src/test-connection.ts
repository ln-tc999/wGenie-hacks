import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

// Default to local Supabase instance on port 54352 (fusion-mastra project)
const DEFAULT_LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54352/postgres';

/**
 * Test script to verify Mastra Supabase connection
 *
 * Run with: pnpm test:connection
 *
 * Uses MASTRA_DATABASE_URL env var if set, otherwise defaults to local Supabase on port 54352
 */

async function testConnection() {
  console.log('Testing Mastra Supabase connection...\n');

  const connectionString = process.env.MASTRA_DATABASE_URL || DEFAULT_LOCAL_DATABASE_URL;

  if (process.env.MASTRA_DATABASE_URL) {
    console.log('Using MASTRA_DATABASE_URL from environment ✓');
  } else {
    console.log('Using local Supabase (port 54352) ✓');
    console.log('Tip: Start local Supabase with: cd packages/supabase-mastra && supabase start\n');
  }

  // Mask password in URL for display
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to: ${maskedUrl}\n`);

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Test with a simple query
    const result = await client.query('SELECT NOW() as current_time, current_database() as database');
    console.log(`✓ Database: ${result.rows[0].database}`);
    console.log(`✓ Server time: ${result.rows[0].current_time}`);

    // Check for existing Mastra tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'mastra_%'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('\nExisting Mastra tables:');
      tablesResult.rows.forEach((row) => {
        console.log(`  • ${row.table_name}`);
      });
    } else {
      console.log('\nNo Mastra tables found yet (they will be auto-created on first use)');
    }

    console.log('\n✓ Mastra Supabase storage is ready to use!');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

testConnection();
