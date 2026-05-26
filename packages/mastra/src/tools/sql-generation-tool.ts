import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const sqlGenerationTool = createTool({
  id: 'sql-generation',
  inputSchema: z.object({
    naturalLanguageQuery: z.string().describe('Natural language query from the user'),
    databaseSchema: z.object({
      tables: z.array(
        z.object({
          schema_name: z.string(),
          table_name: z.string(),
          table_owner: z.string(),
        }),
      ),
      columns: z.array(
        z.object({
          table_schema: z.string(),
          table_name: z.string(),
          column_name: z.string(),
          data_type: z.string(),
          character_maximum_length: z.number().nullable(),
          numeric_precision: z.number().nullable(),
          numeric_scale: z.number().nullable(),
          is_nullable: z.string(),
          column_default: z.string().nullable(),
          is_primary_key: z.boolean(),
        }),
      ),
      relationships: z.array(
        z.object({
          table_schema: z.string(),
          table_name: z.string(),
          column_name: z.string(),
          foreign_table_schema: z.string(),
          foreign_table_name: z.string(),
          foreign_column_name: z.string(),
          constraint_name: z.string(),
        }),
      ),
      indexes: z.array(
        z.object({
          schema_name: z.string(),
          table_name: z.string(),
          index_name: z.string(),
          index_definition: z.string(),
        }),
      ),
      rowCounts: z.array(
        z.object({
          schema_name: z.string(),
          table_name: z.string(),
          row_count: z.number(),
          error: z.string().optional(),
        }),
      ),
    }),
  }),
  description: 'Generates SQL queries from natural language descriptions using database schema information',
  execute: async ({ naturalLanguageQuery, databaseSchema }) => {
    try {
      console.log('🔌 Generating SQL query for:', naturalLanguageQuery);
      // Create a comprehensive schema description for the AI
      const schemaDescription = createSchemaDescription(databaseSchema);

      const systemPrompt = `You are an expert PostgreSQL query generator. Your task is to convert natural language questions into accurate SQL queries.

DATABASE SCHEMA:
${schemaDescription}

RULES:
1. Only generate SELECT queries for data retrieval
2. Use proper PostgreSQL syntax
3. Always qualify column names with table names when joining tables
4. Use appropriate JOINs when data from multiple tables is needed
5. Be case-insensitive for text searches using ILIKE
6. Use proper data types for comparisons
7. Format queries with proper indentation and line breaks
8. Include appropriate WHERE clauses to filter results
9. Use LIMIT when appropriate to prevent overly large result sets
10. Consider performance implications of the query

QUERY ANALYSIS:
- Analyze the user's question carefully
- Identify which tables and columns are needed
- Determine if joins are required
- Consider aggregation functions if needed
- Think about appropriate filtering conditions
- Consider ordering and limiting results

You MUST respond with ONLY a valid JSON object (no markdown, no code blocks) matching this exact format:
{
  "sql": "the SQL query",
  "explanation": "explanation of what the query does",
  "confidence": 0.9,
  "assumptions": ["assumption 1", "assumption 2"],
  "tables_used": ["table1", "table2"]
}`;

      const userPrompt = `Generate a SQL query for this question: "${naturalLanguageQuery}"`;

      const result = await generateText({
        model: openai('gpt-5.4-mini'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      });

      const parsed = JSON.parse(result.text);

      return {
        sql: String(parsed.sql || ''),
        explanation: String(parsed.explanation || ''),
        confidence: Number(parsed.confidence || 0),
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : [],
        tables_used: Array.isArray(parsed.tables_used) ? parsed.tables_used.map(String) : [],
      };
    } catch (error) {
      throw new Error(`Failed to generate SQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

function createSchemaDescription(databaseSchema: any): string {
  let description = '';

  // Group columns by table
  const tableColumns = new Map<string, any[]>();
  databaseSchema.columns.forEach((column: any) => {
    const tableKey = `${column.table_schema}.${column.table_name}`;
    if (!tableColumns.has(tableKey)) {
      tableColumns.set(tableKey, []);
    }
    tableColumns.get(tableKey)?.push(column);
  });

  // Create table descriptions
  databaseSchema.tables.forEach((table: any) => {
    const tableKey = `${table.schema_name}.${table.table_name}`;
    const columns = tableColumns.get(tableKey) || [];
    const rowCount = databaseSchema.rowCounts.find(
      (rc: any) => rc.schema_name === table.schema_name && rc.table_name === table.table_name,
    );

    description += `\nTable: ${table.schema_name}.${table.table_name}`;
    if (rowCount) {
      description += ` (${rowCount.row_count} rows)`;
    }
    description += '\nColumns:\n';

    columns.forEach((column: any) => {
      description += `  - ${column.column_name}: ${column.data_type}`;
      if (column.character_maximum_length) {
        description += `(${column.character_maximum_length})`;
      }
      if (column.is_primary_key) {
        description += ' [PRIMARY KEY]';
      }
      if (column.is_nullable === 'NO') {
        description += ' [NOT NULL]';
      }
      if (column.column_default) {
        description += ` [DEFAULT: ${column.column_default}]`;
      }
      description += '\n';
    });
  });

  // Add relationship information
  if (databaseSchema.relationships.length > 0) {
    description += '\nRelationships:\n';
    databaseSchema.relationships.forEach((rel: any) => {
      description += `  - ${rel.table_schema}.${rel.table_name}.${rel.column_name} → ${rel.foreign_table_schema}.${rel.foreign_table_name}.${rel.foreign_column_name}\n`;
    });
  }

  // Add index information
  if (databaseSchema.indexes.length > 0) {
    description += '\nIndexes:\n';
    databaseSchema.indexes.forEach((index: any) => {
      description += `  - ${index.schema_name}.${index.table_name}: ${index.index_name}\n`;
    });
  }

  return description;
}
