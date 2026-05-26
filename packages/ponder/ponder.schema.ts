import { index, onchainTable, PgColumnsBuilders, primaryKey } from 'ponder';

export const transferEvent = onchainTable('transfer_event', (t) => ({
  id: t.text().primaryKey(),
  amount: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
}));

export const depositEvent = onchainTable('deposit_event', (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  vaultAddress: t.hex().notNull(),
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(),
}));

export const withdrawalEvent = onchainTable('withdrawal_event', (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  vaultAddress: t.hex().notNull(),
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  owner: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  transactionHash: t.hex().notNull(),
}));

// Withdrawal Buckets

const createWithdrawBucket = (t: PgColumnsBuilders) => ({
  chainId: t.integer().notNull(),
  vaultAddress: t.hex().notNull(),
  bucketId: t.integer().notNull(),
  sum: t.bigint().notNull(),
  count: t.integer().notNull(),
});

export const withdrawBuckets_2_HOURS = onchainTable(
  'withdraw_buckets_2_hours',
  createWithdrawBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

export const withdrawBuckets_8_HOURS = onchainTable(
  'withdraw_buckets_8_hours',
  createWithdrawBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

export const withdrawBuckets_1_DAY = onchainTable(
  'withdraw_buckets_1_day',
  createWithdrawBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

export const withdrawBuckets_4_DAYS = onchainTable(
  'withdraw_buckets_4_days',
  createWithdrawBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

// Deposit Buckets

const createDepositBucket = (t: PgColumnsBuilders) => ({
  chainId: t.integer().notNull(),
  vaultAddress: t.hex().notNull(),
  bucketId: t.integer().notNull(),
  sum: t.bigint().notNull(),
  count: t.integer().notNull(),
});

export const depositBuckets_2_HOURS = onchainTable(
  'deposit_buckets_2_hours',
  createDepositBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

export const depositBuckets_8_HOURS = onchainTable(
  'deposit_buckets_8_hours',
  createDepositBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

export const depositBuckets_1_DAY = onchainTable(
  'deposit_buckets_1_day',
  createDepositBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

export const depositBuckets_4_DAYS = onchainTable(
  'deposit_buckets_4_days',
  createDepositBucket,
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.bucketId],
    }),
  }),
);

// Depositor

export const depositor = onchainTable(
  'depositor',
  (t) => ({
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    depositorAddress: t.hex().notNull(),
    shareBalance: t.bigint().notNull(),
    firstActivity: t.integer().notNull(),
    lastActivity: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.chainId, table.vaultAddress, table.depositorAddress],
    }),
  }),
);

// Fuse Events

export const fuseEvent = onchainTable(
  'fuse_event',
  (t) => ({
    id: t.text().primaryKey(),
    chainId: t.integer().notNull(),
    vaultAddress: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    eventName: t.text().notNull(),
    args: t.json().notNull(),
  }),
  (table) => ({
    vaultIdx: index().on(table.chainId, table.vaultAddress, table.timestamp),
    eventNameIdx: index().on(table.eventName),
  }),
);
