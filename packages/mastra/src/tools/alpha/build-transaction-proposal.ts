import { z } from 'zod';
import { simulateOnFork } from './simulate-on-fork';
import type { TransactionProposalOutput } from './types';

interface PendingAction {
  id: string;
  protocol: string;
  actionType: string;
  description: string;
  fuseActions: Array<{ fuse: string; data: string }>;
}

interface NewAction {
  success: boolean;
  protocol: string;
  actionType: string;
  description: string;
  fuseActions: Array<{ fuse: string; data: string }>;
  error?: string;
}

interface BuildProposalParams {
  newAction: NewAction;
  existingPendingActions?: PendingAction[];
  vaultAddress: string;
  chainId: number;
  callerAddress?: string;
  isReady: boolean;
  /** Extra token addresses to include in simulation balance snapshots */
  additionalTokenAddresses?: string[];
}

/**
 * Build a unified TransactionProposalOutput from an action creation result.
 * Handles simulation, action list assembly, and output formatting.
 * Used by all 6 action creation tools (alpha + yo-treasury).
 */
export async function buildTransactionProposal({
  newAction,
  existingPendingActions = [],
  vaultAddress,
  chainId,
  callerAddress,
  isReady,
  additionalTokenAddresses,
}: BuildProposalParams): Promise<TransactionProposalOutput> {
  // If new action failed, return with error — don't add to queue or simulate
  if (!newAction.success) {
    const flatFuseActions = existingPendingActions.flatMap(a => a.fuseActions);
    return {
      type: 'transaction-proposal' as const,
      status: 'partial',
      actions: existingPendingActions,
      newAction: {
        success: false,
        protocol: newAction.protocol,
        actionType: newAction.actionType,
        description: newAction.description,
        error: newAction.error,
      },
      vaultAddress,
      chainId,
      flatFuseActions,
      actionsCount: existingPendingActions.length,
      fuseActionsCount: flatFuseActions.length,
      actionsSummary: existingPendingActions
        .map(a => `${a.actionType} on ${a.protocol}: ${a.description}`)
        .join('\n'),
    };
  }

  // Build complete action list
  const newEntry: PendingAction = {
    id: String(existingPendingActions.length + 1),
    protocol: newAction.protocol,
    actionType: newAction.actionType,
    description: newAction.description,
    fuseActions: newAction.fuseActions,
  };
  const allActions = [...existingPendingActions, newEntry];
  const flatFuseActions = allActions.flatMap(a => a.fuseActions);

  // Always simulate when callerAddress is available
  let simulation;
  if (callerAddress && flatFuseActions.length > 0) {
    const simResult = await simulateOnFork({
      vaultAddress,
      chainId,
      callerAddress,
      flatFuseActions,
      additionalTokenAddresses,
    });
    simulation = {
      ...simResult,
      actionsCount: allActions.length,
    };
  }

  return {
    type: 'transaction-proposal' as const,
    status: isReady ? 'ready' : 'partial',
    actions: allActions,
    newAction: {
      success: true,
      protocol: newAction.protocol,
      actionType: newAction.actionType,
      description: newAction.description,
    },
    simulation,
    vaultAddress,
    chainId,
    flatFuseActions,
    actionsCount: allActions.length,
    fuseActionsCount: flatFuseActions.length,
    actionsSummary: allActions
      .map(a => `${a.actionType} on ${a.protocol}: ${a.description}`)
      .join('\n'),
  };
}

/** Zod output schema for TransactionProposalOutput — shared by all action creation tools */
export const transactionProposalOutputSchema = z.object({
  type: z.literal('transaction-proposal'),
  status: z.enum(['partial', 'ready']),
  actions: z.array(z.object({
    id: z.string(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    fuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
  })),
  newAction: z.object({
    success: z.boolean(),
    protocol: z.string(),
    actionType: z.string(),
    description: z.string(),
    error: z.string().optional(),
  }),
  simulation: z.any().optional(),
  vaultAddress: z.string(),
  chainId: z.number(),
  flatFuseActions: z.array(z.object({ fuse: z.string(), data: z.string() })),
  actionsCount: z.number(),
  fuseActionsCount: z.number(),
  actionsSummary: z.string(),
});
