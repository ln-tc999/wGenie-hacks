/**
 * Discriminated union for all Alpha Agent tool outputs.
 *
 * The `type` field is the discriminator — the web app uses it to decide
 * which React component to render for each tool output.
 */

/** A position in a DeFi market */
export interface MarketPosition {
  substrate: string;
  underlyingToken: string;
  underlyingSymbol: string;
  label?: string;
  supplyFormatted: string;
  supplyValueUsd: string;
  borrowFormatted: string;
  borrowValueUsd: string;
  totalValueUsd: string;
}

/** A DeFi market with its positions */
export interface MarketAllocation {
  marketId: string;
  protocol: string;
  positions: MarketPosition[];
  totalValueUsd: string;
}

/** Balance snapshot for a vault — ERC20 tokens + market positions */
export interface BalanceSnapshot {
  assets: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
    priceUsd: string;
    valueUsd: string;
  }>;
  markets: MarketAllocation[];
  totalValueUsd: string;
}

/** Unified transaction proposal — replaces action-with-simulation, pending-actions, execute-actions */
export type TransactionProposalOutput = {
  type: 'transaction-proposal';
  /** 'partial' = more actions expected (no execute), 'ready' = final (show execute) */
  status: 'partial' | 'ready';
  /** All pending actions (existing + newly created) */
  actions: Array<{
    id: string;
    protocol: string;
    actionType: string;
    description: string;
    fuseActions: Array<{ fuse: string; data: string }>;
  }>;
  /** The newly created action result */
  newAction: {
    success: boolean;
    protocol: string;
    actionType: string;
    description: string;
    error?: string;
  };
  /** Fork simulation of the full batch (always runs when callerAddress available) */
  simulation?: {
    success: boolean;
    message: string;
    actionsCount: number;
    fuseActionsCount: number;
    balancesBefore?: BalanceSnapshot;
    balancesAfter?: BalanceSnapshot;
    error?: string;
  };
  /** Execute data — always included, UI uses status to show/hide execute section */
  vaultAddress: string;
  chainId: number;
  flatFuseActions: Array<{ fuse: string; data: string }>;
  actionsCount: number;
  fuseActionsCount: number;
  actionsSummary: string;
};

/** Lightweight balance data for agent reasoning — not rendered in UI */
export type BalanceCheckOutput = {
  type: 'balance-check';
  success: boolean;
  assets: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    balanceFormatted: string;
    priceUsd: string;
    valueUsd: string;
  }>;
  markets: MarketAllocation[];
  totalValueUsd: string;
  error?: string;
};

/** Union of all alpha tool output types */
export type AlphaToolOutput =
  | TransactionProposalOutput
  | BalanceCheckOutput;
