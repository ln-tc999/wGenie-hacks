import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProtocolById, toSolidityName, toAbiFileName, FUSE_TYPES } from './fuse-data';

// Get the repo root directory
function getRepoRoot(): string {
  // Navigate from packages/mastra to repo root
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // From packages/mastra/src/tools/fuse-explorer -> repo root (5 levels up)
  return join(currentDir, '..', '..', '..', '..', '..');
}

export const getProtocolFuseInfoTool = createTool({
  id: 'get-protocol-fuse-info',
  description: `Get detailed information about a specific protocol's fuses.
Returns fuse file paths, interfaces, and README documentation if available.
Use this to understand how a protocol's fuses work and their capabilities.`,
  inputSchema: z.object({
    protocolId: z
      .string()
      .describe('Protocol ID (e.g., "aave_v3", "morpho", "uniswap", "balancer")'),
    includeReadme: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include README documentation if available'),
  }),
  outputSchema: z.object({
    protocolId: z.string(),
    protocolName: z.string(),
    description: z.string(),
    category: z.string(),
    solidityPath: z.string(),
    fuses: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        typeDescription: z.string(),
        solidityFile: z.string(),
        abiFile: z.string(),
      })
    ),
    readme: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ protocolId, includeReadme }) => {

    const protocol = getProtocolById(protocolId);
    if (!protocol) {
      return {
        protocolId,
        protocolName: 'Unknown',
        description: '',
        category: '',
        solidityPath: '',
        fuses: [],
        error: `Protocol "${protocolId}" not found. Use list-fuse-protocols to see available protocols.`,
      };
    }

    const repoRoot = getRepoRoot();
    const solidityPath = `external/wgenie-fusion/contracts/fuses/${protocol.id}/`;

    // Determine fuse type for each fuse
    const getFuseType = (fuseName: string): { type: string; description: string } => {
      const lowerName = fuseName.toLowerCase();
      if (lowerName.includes('balance')) {
        return FUSE_TYPES.find((t) => t.type === 'Balance') || { type: 'Balance', description: '' };
      }
      if (lowerName.includes('supply') || lowerName.includes('deposit')) {
        return FUSE_TYPES.find((t) => t.type === 'Supply') || { type: 'Supply', description: '' };
      }
      if (lowerName.includes('borrow')) {
        return FUSE_TYPES.find((t) => t.type === 'Borrow') || { type: 'Borrow', description: '' };
      }
      if (lowerName.includes('collateral')) {
        return FUSE_TYPES.find((t) => t.type === 'Collateral') || { type: 'Collateral', description: '' };
      }
      if (lowerName.includes('swap')) {
        return FUSE_TYPES.find((t) => t.type === 'Swap') || { type: 'Swap', description: '' };
      }
      if (lowerName.includes('position') || lowerName.includes('collect')) {
        return FUSE_TYPES.find((t) => t.type === 'Position') || { type: 'Position', description: '' };
      }
      if (lowerName.includes('gauge')) {
        return FUSE_TYPES.find((t) => t.type === 'Gauge') || { type: 'Gauge', description: '' };
      }
      return FUSE_TYPES.find((t) => t.type === 'Special') || { type: 'Special', description: '' };
    };

    const fuses = protocol.fuses.map((fuseName) => {
      const fuseTypeInfo = getFuseType(fuseName);
      return {
        name: fuseName,
        type: fuseTypeInfo.type,
        typeDescription: fuseTypeInfo.description,
        solidityFile: `${toSolidityName(protocol.id)}${fuseName}Fuse.sol`,
        abiFile: toAbiFileName(protocol.id, fuseName),
      };
    });

    let readme: string | undefined;
    if (includeReadme && protocol.hasReadme) {
      try {
        const readmePath = join(repoRoot, solidityPath, 'README.md');
        if (existsSync(readmePath)) {
          readme = readFileSync(readmePath, 'utf-8');
        }
      } catch {
        // README not found or not readable
      }
    }

    return {
      protocolId: protocol.id,
      protocolName: protocol.name,
      description: protocol.description,
      category: protocol.category,
      solidityPath,
      fuses,
      readme,
    };
  },
});
