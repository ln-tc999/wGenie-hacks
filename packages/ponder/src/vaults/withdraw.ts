import { ponder } from 'ponder:registry';
import schema from 'ponder:schema';
import { getBucketId } from '../utils/buckets';

ponder.on('ERC4626:Withdraw', async ({ event, context }) => {
  const { timestamp } = event.block;
  const { assets } = event.args;
  const { id: chainId } = context.chain;
  const vaultAddress = event.log.address;

  const setValue = (bucketId: number) => ({
    chainId,
    vaultAddress,
    bucketId,
    sum: assets,
    count: 1,
  });

  const update = (row: { sum: bigint; count: number }) => ({
    sum: row.sum + assets,
    count: row.count + 1,
  });

  await context.db
    .insert(schema.withdrawBuckets_2_HOURS)
    .values(setValue(getBucketId(Number(timestamp), '2_HOURS')))
    .onConflictDoUpdate(update);

  await context.db
    .insert(schema.withdrawBuckets_8_HOURS)
    .values(setValue(getBucketId(Number(timestamp), '8_HOURS')))
    .onConflictDoUpdate(update);

  await context.db
    .insert(schema.withdrawBuckets_1_DAY)
    .values(setValue(getBucketId(Number(timestamp), '1_DAY')))
    .onConflictDoUpdate(update);

  await context.db
    .insert(schema.withdrawBuckets_4_DAYS)
    .values(setValue(getBucketId(Number(timestamp), '4_DAYS')))
    .onConflictDoUpdate(update);

  await context.db
    .insert(schema.withdrawalEvent)
    .values({
      id: event.id,
      chainId,
      vaultAddress,
      sender: event.args.caller,
      owner: event.args.owner,
      receiver: event.args.receiver,
      assets: event.args.assets,
      shares: event.args.shares,
      timestamp: Number(timestamp),
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
