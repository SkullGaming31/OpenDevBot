#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../src/util/logger';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(uri, { dbName: process.env.DB_NAME || undefined });

  const { UserModel } = await import('../src/database/models/userModel');
  const BankAccount = (await import('../src/database/models/bankAccount')).default;

  const users = await UserModel.find({ balance: { $exists: true, $ne: 0 } }).lean();
  logger.info(`Found ${users.length} users with non-zero legacy wallet balance.`);

  let processed = 0;
  for (const u of users) {
    const id = u.id || undefined;
    const uname = (u.username || '').toLowerCase();
    const bal = Number(u.balance || 0);
    if (!bal) continue;

    logger.info(`User ${id || uname}: ${bal}`);
    if (apply) {
      const q = id ? { userId: id } : { username: uname };
      await BankAccount.updateOne(q, { $inc: { wallet: bal }, $setOnInsert: { userId: id, username: uname } }, { upsert: true });
      // Optionally zero out legacy wallet (commented out)
      // await UserModel.updateOne({ _id: u._id }, { $set: { balance: 0 } });
    }
    processed++;
  }

  logger.info(`Processed ${processed} users. Apply=${apply}`);
  await mongoose.disconnect();
}

main().catch(err => {
  logger.error('Migration error', err);
  process.exit(1);
});
