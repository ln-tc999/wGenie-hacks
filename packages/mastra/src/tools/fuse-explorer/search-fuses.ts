import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { searchFuses, toSolidityName, toAbiFileName } from './fuse-data';

export const searchFusesTool = createTool({
  id: 'search-fuses',
  description: `Search for fuses by name, protocol, or description.
Use this when looking for specific fuse functionality (e.g., "swap", "borrow", "balance").
Returns matching protocols and fuses with their Solidity and TypeScript file naming conventions.`,
  inputSchema: z.object({
    query: z.string().describe('Search query - protocol name, fuse type, or functionality'),
  }),
  outputSchema: z.object({
    totalMatches: z.number(),
    results: z.array(
      z.object({
        protocolId: z.string(),
        protocolName: z.string(),
        category: z.string(),
        matchingFuses: z.array(
          z.object({
            fuseName: z.string(),
            solidityFileName: z.string(),
            abiFileName: z.string(),
          })
        ),
      })
    ),
  }),
  execute: async ({ query }) => {
    const results = searchFuses(query);

    return {
      totalMatches: results.reduce((sum, r) => sum + r.matchingFuses.length, 0),
      results: results.map((r) => ({
        protocolId: r.protocol.id,
        protocolName: r.protocol.name,
        category: r.protocol.category,
        matchingFuses: r.matchingFuses.map((fuseName) => ({
          fuseName,
          solidityFileName: `${toSolidityName(r.protocol.id)}${fuseName}Fuse.sol`,
          abiFileName: toAbiFileName(r.protocol.id, fuseName),
        })),
      })),
    };
  },
});
