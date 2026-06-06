import { ponder } from 'ponder:registry';
import schema from 'ponder:schema';

ponder.on('WalletGenieTreasury:Deposited', async ({ event, context }) => {
  const { timestamp } = event.block;
  const { user, amount } = event.args;
  const { id: chainId } = context.chain;
  const treasuryAddress = event.log.address;

  await context.db
    .insert(schema.treasuryDeposit)
    .values({
      id: event.id,
      chainId,
      treasuryAddress,
      user,
      amount,
      timestamp: Number(timestamp),
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('WalletGenieTreasury:Executed', async ({ event, context }) => {
  const { timestamp } = event.block;
  const { target, value, data } = event.args;
  const { id: chainId } = context.chain;
  const treasuryAddress = event.log.address;

  await context.db
    .insert(schema.treasuryExecution)
    .values({
      id: event.id,
      chainId,
      treasuryAddress,
      target,
      value,
      data,
      timestamp: Number(timestamp),
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('WalletGenieTreasury:ManagerUpdated', async ({ event, context }) => {
  const { timestamp } = event.block;
  const { manager } = event.args;
  const { id: chainId } = context.chain;
  const treasuryAddress = event.log.address;

  await context.db
    .insert(schema.treasuryManager)
    .values({
      id: event.id,
      chainId,
      treasuryAddress,
      manager,
      timestamp: Number(timestamp),
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
