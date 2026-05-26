import { z } from 'zod';

/**
 * Creates a pending action schema with the given protocol enum values.
 * Shared between Alpha and YO Treasury agents.
 */
export function createPendingActionSchema<T extends [string, ...string[]]>(protocols: T) {
  return z.object({
    id: z.string().describe('Unique ID, e.g. "1", "2"'),
    protocol: z.enum(protocols).describe('Protocol name'),
    actionType: z.enum(['supply', 'withdraw', 'borrow', 'repay', 'swap']).describe('Action type'),
    description: z.string().describe('Human-readable description'),
    fuseActions: z.array(z.object({
      fuse: z.string().describe('Fuse contract address'),
      data: z.string().describe('Hex-encoded calldata'),
    })),
  });
}

export function createWorkingMemorySchema<T extends [string, ...string[]]>(protocols: T) {
  return z.object({
    pendingActions: z.array(createPendingActionSchema(protocols)).optional().describe(
      'List of pending fuse actions to execute as a batch'
    ),
  });
}
