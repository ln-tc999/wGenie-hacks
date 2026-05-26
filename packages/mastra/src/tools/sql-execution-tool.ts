import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Client } from 'pg';
import { FUSION_PONDER_CONNECTION_STRING } from '../env';

const createDatabaseConnection = (connectionString: string) => {
  return new Client({
    connectionString,
    connectionTimeoutMillis: 30000, // 30 seconds
    statement_timeout: 60000, // 1 minute
    query_timeout: 60000, // 1 minute
  });
};

const executeQuery = async (client: Client, query: string) => {
  try {
    console.log('Executing query:', query);
    const result = await client.query(query);
    console.log('Query result:', result.rows);
    return result.rows;
  } catch (error) {
    throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const sqlExecutionTool = createTool({
  id: 'sql-execution',
  inputSchema: z.object({
    query: z.string().describe('SQL query to execute'),
  }),
  description: 'Executes SQL queries against the Fusion Ponder PostgreSQL database. Pre-configured for the Fusion blockchain indexing database containing ERC4626 vault events.',
  execute: async ({ query }) => {
    if (!FUSION_PONDER_CONNECTION_STRING) {
      return { success: false, error: 'PONDER_DATABASE_URL is not configured. Set the environment variable to use database tools.', executedQuery: query };
    }
    const client = createDatabaseConnection(FUSION_PONDER_CONNECTION_STRING);

    try {
      console.log('🔌 Connecting to PostgreSQL for query execution...');
      await client.connect();
      console.log('✅ Connected to PostgreSQL for query execution');

      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }

      const result = await executeQuery(client, query);

      return {
        success: true,
        data: result,
        rowCount: result.length,
        executedQuery: query,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedQuery: query,
      };
    } finally {
      await client.end();
    }
  },
});
