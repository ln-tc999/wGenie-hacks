/**
 * Mock data for the CFO dashboard slice (Nexonza layout, WalletGenie content).
 *
 * Kept isolated so the UI can be wired to real sources later:
 *  - holdings/total  -> /api/cfo/treasury/chat `readTreasuryBalances` or PlasmaVault
 *  - chart series    -> Ponder share-price / treasury-value history
 *  - activity        -> Ponder deposit/withdraw/transfer events
 */

export const TREASURY = {
  name: 'WalletGenie Treasury',
  address: '0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4',
  chainId: 5003,
  chainName: 'Mantle Sepolia',
} as const;

export const OVERVIEW = {
  totalValueUsd: 52418.9,
  totalValueLabel: '$52,418.90',
  change24hPct: 2.4,
  change24hUsd: '+$1,228.40',
  blendedApyPct: 6.8,
  positive: true,
} as const;

export type Holding = {
  symbol: string;
  name: string;
  valueLabel: string;
  weightPct: number;
  /** brand color used for the dot + distribution segment */
  color: string;
};

export const HOLDINGS: Holding[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    valueLabel: '$31,200.00',
    weightPct: 59.5,
    color: '#2775CA',
  },
  {
    symbol: 'MNT',
    name: 'Mantle',
    valueLabel: '$15,100.50',
    weightPct: 28.8,
    color: '#4E6FFF',
  },
  {
    symbol: 'USDY',
    name: 'Ondo US Dollar Yield',
    valueLabel: '$6,118.40',
    weightPct: 11.7,
    color: '#00FF8B',
  },
];

/** Allocation by protocol — shown as the distribution legend. */
export const ALLOCATIONS = [
  { label: 'Aave V3', valueLabel: '$31,200', weightPct: 59.5, color: '#2775CA' },
  {
    label: 'Merchant Moe',
    valueLabel: '$15,100',
    weightPct: 28.8,
    color: '#4E6FFF',
  },
  { label: 'Idle', valueLabel: '$6,118', weightPct: 11.7, color: '#00FF8B' },
] as const;

/** SVG line-chart points (0..800 x, 0..300 y). Lower y = higher value. */
export const CHART_PATH =
  'M0,240 L50,220 L100,250 L150,230 L200,255 L250,245 L300,265 L350,250 L400,240 L450,225 L500,235 L550,240 L600,250 L650,230 L700,220 L750,160 L800,150';

export const CHART_TOOLTIP = {
  range: '12:00 — 16:00',
  valueLabel: '$52,418.90',
  changeLabel: '+2.4% since yesterday',
} as const;

export type ActivityKind = 'deposit' | 'supply' | 'swap' | 'withdraw';

export type ActivityItem = {
  kind: ActivityKind;
  title: string;
  subtitle: string;
  time: string;
};

export type ActivityGroup = {
  date: string;
  items: ActivityItem[];
};

export const ACTIVITY: ActivityGroup[] = [
  {
    date: '12 Jun 2026',
    items: [
      {
        kind: 'deposit',
        title: '+1,000.00 USDC',
        subtitle: 'Deposit from 0x3a8d…84B',
        time: '15:23',
      },
    ],
  },
  {
    date: '11 Jun 2026',
    items: [
      {
        kind: 'supply',
        title: '5,000.00 USDC',
        subtitle: 'Supplied to Aave V3',
        time: '12:23',
      },
      {
        kind: 'swap',
        title: '2.00 MNT → USDC',
        subtitle: 'Swap on Merchant Moe',
        time: '09:28',
      },
    ],
  },
];

/* ── Treasury page ───────────────────────────────────────────────────────── */

export type Position = {
  protocol: string;
  asset: string;
  amountLabel: string;
  valueLabel: string;
  apyLabel: string;
  /** 24h change, signed */
  changePct: number;
  color: string;
};

export const POSITIONS: Position[] = [
  {
    protocol: 'Aave V3',
    asset: 'USDC',
    amountLabel: '31,200.00',
    valueLabel: '$31,200.00',
    apyLabel: '5.4%',
    changePct: 0.8,
    color: '#2775CA',
  },
  {
    protocol: 'Merchant Moe',
    asset: 'MNT-USDC LP',
    amountLabel: '15,100.50',
    valueLabel: '$15,100.50',
    apyLabel: '11.2%',
    changePct: 2.1,
    color: '#4E6FFF',
  },
  {
    protocol: 'Idle',
    asset: 'USDY',
    amountLabel: '6,118.40',
    valueLabel: '$6,118.40',
    apyLabel: '4.1%',
    changePct: -0.3,
    color: '#00FF8B',
  },
];

export const TREASURY_STATS = [
  { label: 'Total value', value: '$52,418.90' },
  { label: 'Deployed', value: '88.3%' },
  { label: 'Blended APY', value: '6.8%' },
  { label: 'Est. monthly yield', value: '+$297.10' },
] as const;

/* ── Strategy page ───────────────────────────────────────────────────────── */

export type Strategy = {
  name: string;
  status: 'Active' | 'Paused' | 'Draft';
  description: string;
  targetApyLabel: string;
  allocationLabel: string;
  cadence: string;
};

export const STRATEGIES: Strategy[] = [
  {
    name: 'Conservative Yield',
    status: 'Active',
    description: '60% Aave USDC · 30% Merchant Moe MNT-USDC · 10% idle buffer.',
    targetApyLabel: '6.8%',
    allocationLabel: '$46,300',
    cadence: 'Rebalance weekly',
  },
  {
    name: 'MNT Accumulation',
    status: 'Paused',
    description: 'Route 20% of yield into MNT on every rebalance.',
    targetApyLabel: '8.4%',
    allocationLabel: '$0',
    cadence: 'Rebalance on +5% MNT dip',
  },
  {
    name: 'Cross-chain Idle Sweep',
    status: 'Draft',
    description: 'Move idle Solana balance into top Byreal CLMM pool by fee APR.',
    targetApyLabel: '—',
    allocationLabel: '$6,118',
    cadence: 'Manual approval',
  },
];

/* ── Activity page (flat, more rows) ─────────────────────────────────────── */

export type ActivityRow = {
  kind: ActivityKind;
  action: string;
  detail: string;
  amountLabel: string;
  date: string;
  status: 'Confirmed' | 'Pending';
  hash: string;
};

export const ACTIVITY_ROWS: ActivityRow[] = [
  {
    kind: 'deposit',
    action: 'Deposit',
    detail: 'from 0x3a8d…84B',
    amountLabel: '+1,000.00 USDC',
    date: '12 Jun 2026 · 15:23',
    status: 'Confirmed',
    hash: '0x465f…3faf',
  },
  {
    kind: 'supply',
    action: 'Supply',
    detail: 'Aave V3 · USDC',
    amountLabel: '5,000.00 USDC',
    date: '11 Jun 2026 · 12:23',
    status: 'Confirmed',
    hash: '0x91ab…7c20',
  },
  {
    kind: 'swap',
    action: 'Swap',
    detail: 'Merchant Moe · MNT → USDC',
    amountLabel: '2.00 MNT',
    date: '11 Jun 2026 · 09:28',
    status: 'Confirmed',
    hash: '0x77de…11a4',
  },
  {
    kind: 'withdraw',
    action: 'Withdraw',
    detail: 'Aave V3 · USDC',
    amountLabel: '1,200.00 USDC',
    date: '09 Jun 2026 · 18:02',
    status: 'Confirmed',
    hash: '0x0a1b…9f3c',
  },
  {
    kind: 'deposit',
    action: 'Deposit',
    detail: 'from 0x3a8d…84B',
    amountLabel: '+10,000.00 USDC',
    date: '08 Jun 2026 · 10:44',
    status: 'Confirmed',
    hash: '0xbe21…44d5',
  },
];
