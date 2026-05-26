import { ponder } from 'ponder:registry';
import schema from 'ponder:schema';

ponder.on('ERC4626:Transfer', async ({ event, context }) => {
  const { timestamp } = event.block;
  const { from, to, amount } = event.args;
  const { id: chainId } = context.chain;
  const vaultAddress = event.log.address;

  await context.db
    .insert(schema.transferEvent)
    .values({
      id: event.id,
      from: event.args.from,
      to: event.args.to,
      amount: event.args.amount,
      timestamp: Number(event.block.timestamp),
    })
    .onConflictDoNothing();

  await context.db
    .insert(schema.depositor)
    .values({
      chainId,
      vaultAddress,
      depositorAddress: from,
      shareBalance: -amount, // This will be overridden in onConflictDoUpdate
      firstActivity: Number(timestamp),
      lastActivity: Number(timestamp),
    })
    .onConflictDoUpdate((row) => ({
      shareBalance: row.shareBalance - amount,
      lastActivity: Number(timestamp),
    }));

  await context.db
    .insert(schema.depositor)
    .values({
      chainId,
      vaultAddress,
      depositorAddress: to,
      shareBalance: amount,
      firstActivity: Number(timestamp),
      lastActivity: Number(timestamp),
    })
    .onConflictDoUpdate((row) => ({
      shareBalance: row.shareBalance + amount,
      lastActivity: Number(timestamp),
    }));
});
