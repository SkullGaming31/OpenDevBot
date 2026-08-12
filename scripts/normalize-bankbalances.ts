#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../src/util/logger';

dotenv.config();

// Resolve Mongo URI the same way other scripts do (prefer DOCKER_URI for local dev)
const uri = process.env.DOCKER_URI || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
  const apply = process.argv.includes('--apply');
  const dbName = process.env.MONGO_DB || process.env.DB_NAME || process.env.MONGO_DB_NAME || undefined;
  await mongoose.connect(uri, { dbName } as any);

  const BankAccount = (await import('../src/database/models/bankAccount')).default;

  // Report total documents and scan for non-object or legacy numeric `balance` values.
  const total = await BankAccount.countDocuments();
  logger.info(`Total BankAccount documents: ${total}`);

  const cursor = BankAccount.find().lean().cursor();
  let scanned = 0;
  let toFix: any[] = [];
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    scanned++;
    const b: any = (doc as any).balance;
    const isObject = b !== null && typeof b === 'object' && !Array.isArray(b);
    if (!isObject) {
      toFix.push({ _id: doc._id, balance: b });
      if (toFix.length >= 20) break; // gather sample up to 20
    }
  }

  logger.info(`Scanned ${scanned} BankAccount docs; found ${toFix.length} sample non-object balances. Apply=${apply}`);
  if (toFix.length > 0) logger.info(`Samples: ${JSON.stringify(toFix, null, 2)}`);

  if (apply) {
    // Apply normalization to all documents where balance is not an object
    const applyCursor = BankAccount.find().lean().cursor();
    let applied = 0;
    for (let doc = await applyCursor.next(); doc != null; doc = await applyCursor.next()) {
      try {
        const b = (doc as any).balance;
        const isObject = b !== null && typeof b === 'object' && !Array.isArray(b);
        if (!isObject) {
          let newBal: any;
          if (typeof b === 'number') newBal = { bank: b, wallet: 0 };
          else newBal = { bank: 0, wallet: 0 };
          await BankAccount.updateOne({ _id: doc._id }, { $set: { balance: newBal } });
          logger.info(`Updated ${doc._id} -> ${JSON.stringify(newBal)}`);
          applied++;
        }
      } catch (err) {
        logger.error(`Failed to update ${doc._id}`, err);
      }
    }
    logger.info(`Applied normalization to ${applied} documents.`);
  }
  await mongoose.disconnect();
}

main().catch(err => {
  logger.error('Normalization error', err);
  process.exit(1);
});
