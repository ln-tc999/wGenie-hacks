import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  FUSE_PROTOCOLS,
  CATEGORY_DESCRIPTIONS,
  getProtocolsByCategory,
  getTotalFuseCount,
} from './fuse-data';

export const listFuseProtocolsTool = createTool({
  id: 'list-fuse-protocols',
  description: `List all DeFi protocols that have fuse integrations for Plasma Vaults.
Can filter by category: lending, dex, yield, execution, basic, vault.
Returns protocol name, description, available fuses, and whether documentation exists.`,
  inputSchema: z.object({
    category: z
      .enum(['lending', 'dex', 'yield', 'execution', 'basic', 'vault', 'all'])
      .optional()
      .default('all')
      .describe('Filter by protocol category'),
  }),
  outputSchema: z.object({
    totalProtocols: z.number(),
    totalFuses: z.number(),
    categoryDescription: z.string().optional(),
    protocols: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.string(),
        fuseCount: z.number(),
        fuses: z.array(z.string()),
        hasDocumentation: z.boolean(),
      })
    ),
  }),
  execute: async ({ category: rawCategory }) => {
    const category = rawCategory ?? 'all';

    const protocols =
      category === 'all' ? FUSE_PROTOCOLS : getProtocolsByCategory(category);

    return {
      totalProtocols: protocols.length,
      totalFuses: category === 'all' ? getTotalFuseCount() : protocols.reduce((sum, p) => sum + p.fuses.length, 0),
      categoryDescription: category !== 'all' ? CATEGORY_DESCRIPTIONS[category] : undefined,
      protocols: protocols.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        fuseCount: p.fuses.length,
        fuses: p.fuses,
        hasDocumentation: p.hasReadme,
      })),
    };
  },
});
