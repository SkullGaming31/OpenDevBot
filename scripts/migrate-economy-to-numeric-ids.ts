// @ts-nocheck
/*
Safe migration script: migrate BankAccount.userId keys between usernames and numeric Twitch IDs.
Usage:
  ts-node scripts/migrate-economy-to-numeric-ids.ts [--apply] [--merge=sum|skip|replace] [--limit=N] [--to=ids|usernames]

By default the script runs in dry-run (no writes). Use --apply to perform changes.
merge options:
  sum     - add balances together into the target account and remove the source account
  skip    - skip migration when target account already exists (no change)
  replace - overwrite target account with source account (dangerous)

This script requires the app's MongoDB connection string via env (e.g., DOCKER_URI or MONGO_URI).
*/

import mongoose from 'mongoose';

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const mergeArg = argv.find(a => a.startsWith('--merge='));
  const mergeMode = mergeArg ? mergeArg.split('=')[1] : 'skip';
  const toArg = argv.find(a => a.startsWith('--to='));
  const toMode = toArg ? toArg.split('=')[1] : 'ids';
  const limitArg = argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  console.log('Migration: migrate-economy-to-numeric-ids');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}; merge=${mergeMode}; limit=${limit ?? 'none'}; to=${toMode}`);

  const mongoUri = process.env.DOCKER_URI || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/opendevbot';
  console.log('Connecting to', mongoUri);
  await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB_NAME || undefined } as any);

  const BankAccount = (await import('../src/database/models/bankAccount')).default;
  const { UserModel } = await import('../src/database/models/userModel');
  const TransactionLog = (await import('../src/database/models/transactionLog')).default;

  try {
    let filter: Record<string, unknown>;
    if (toMode === 'usernames') {
      // migrate numeric -> username
      filter = { userId: { $regex: /^\\d+$/ } } as any;
    } else {
      // migrate username -> numeric (default)
      filter = { userId: { $not: /^\\d+$/ } } as any;
    }

    // Load all accounts and filter in JS to avoid unexpected query mismatch
    const all = await BankAccount.find({}).sort({ updatedAt: -1 }).lean();
    const matches = all.filter(d => {
      if (toMode === 'usernames') return /^[0-9]+$/.test(String(d.userId));
      return !/^[0-9]+$/.test(String(d.userId));
    });
    console.log(`Found ${matches.length} matching BankAccount documents to process.`);

    let processed = 0;
    for (const doc of matches) {
      if (limit && processed >= limit) break;
      processed++;
      console.log('\n--');

      if (toMode !== 'usernames') {
        // username -> numeric
        const usernameKey = doc.userId;
        console.log(`Found username-keyed BankAccount: userId=${usernameKey}, balance=${doc.balance}, updatedAt=${doc.updatedAt}`);
        const legacy = await UserModel.findOne({ username: usernameKey }).lean();
        if (!legacy || !legacy.id || !/^[0-9]+$/.test(String(legacy.id))) {
          console.log(`  No numeric id found for username '${usernameKey}' (legacy record: ${legacy ? 'exists' : 'none'}) — skipping`);
          continue;
        }
        const numericId = String(legacy.id);
        console.log(`  Resolved numeric id: ${numericId}`);
        const existing = await BankAccount.findOne({ userId: numericId }).lean();

        if (!existing) {
          console.log('  No existing numeric BankAccount — will rename to numeric id');
          if (apply) {
            await BankAccount.updateOne({ _id: doc._id }, { $set: { userId: numericId }, $currentDate: { updatedAt: true } });
            console.log('  Renamed username account to numeric id');
            await TransactionLog.create([{ type: 'transfer', from: usernameKey, to: numericId, amount: doc.balance || 0, meta: { migration: true, note: 'migrated username -> numericId' } }]);
          } else {
            console.log('  DRY-RUN: would rename username account to numeric id');
          }
        } else {
          console.log(`  Numeric BankAccount exists (balance=${existing.balance}, updatedAt=${existing.updatedAt}).`);
          if (mergeMode === 'skip') {
            console.log('  merge=skip: will not modify existing numeric account; skipping migration for this user.');
            continue;
          }
          if (mergeMode === 'replace') {
            console.log('  merge=replace: will overwrite numeric account with username account values');
            if (apply) {
              await BankAccount.updateOne({ userId: numericId }, { $set: { balance: doc.balance }, $currentDate: { updatedAt: true } });
              await BankAccount.deleteOne({ _id: doc._id });
              await TransactionLog.create([{ type: 'transfer', from: usernameKey, to: numericId, amount: doc.balance || 0, meta: { migration: true, mode: 'replace' } }]);
              console.log('  Applied replace: numeric account overwritten and username account removed');
            } else {
              console.log('  DRY-RUN: would replace numeric account with username account');
            }
            continue;
          }
          if (mergeMode === 'sum') {
            const sum = (existing.balance || 0) + (doc.balance || 0);
            console.log(`  merge=sum: numeric balance=${existing.balance} + username balance=${doc.balance} => ${sum}`);
            if (apply) {
              await BankAccount.updateOne({ userId: numericId }, { $set: { balance: sum }, $currentDate: { updatedAt: true } });
              await BankAccount.deleteOne({ _id: doc._id });
              await TransactionLog.create([{ type: 'transfer', from: usernameKey, to: numericId, amount: doc.balance || 0, meta: { migration: true, mode: 'sum' } }]);
              console.log('  Applied sum merge: username account removed, numeric account updated');
            } else {
              console.log('  DRY-RUN: would sum balances and remove username account');
            }
            continue;
          }
          console.log('  Unknown merge mode; skipping');
        }
      } else {
        // numeric -> username
        const numericKey = String(doc.userId);
        console.log(`Found numeric-keyed BankAccount: userId=${numericKey}, balance=${doc.balance}, updatedAt=${doc.updatedAt}`);
        const legacy = await UserModel.findOne({ id: numericKey }).lean();
        if (!legacy || !legacy.username) {
          console.log(`  No username found for numeric id '${numericKey}' (legacy record: ${legacy ? 'exists' : 'none'}) — skipping`);
          continue;
        }
        const username = String(legacy.username);
        console.log(`  Resolved username: ${username}`);
        const existing = await BankAccount.findOne({ userId: username }).lean();

        if (!existing) {
          console.log('  No existing username BankAccount — will rename to username');
          if (apply) {
            await BankAccount.updateOne({ _id: doc._id }, { $set: { userId: username }, $currentDate: { updatedAt: true } });
            console.log('  Renamed numeric account to username');
            await TransactionLog.create([{ type: 'transfer', from: numericKey, to: username, amount: doc.balance || 0, meta: { migration: true, note: 'migrated numeric -> username' } }]);
          } else {
            console.log('  DRY-RUN: would rename numeric account to username');
          }
        } else {
          console.log(`  Username BankAccount exists (balance=${existing.balance}, updatedAt=${existing.updatedAt}).`);
          if (mergeMode === 'skip') {
            console.log('  merge=skip: will not modify existing username account; skipping migration for this user.');
            continue;
          }
          if (mergeMode === 'replace') {
            console.log('  merge=replace: will overwrite username account with numeric account values');
            if (apply) {
              await BankAccount.updateOne({ userId: username }, { $set: { balance: doc.balance }, $currentDate: { updatedAt: true } });
              await BankAccount.deleteOne({ _id: doc._id });
              await TransactionLog.create([{ type: 'transfer', from: numericKey, to: username, amount: doc.balance || 0, meta: { migration: true, mode: 'replace' } }]);
              console.log('  Applied replace: username account overwritten and numeric account removed');
            } else {
              console.log('  DRY-RUN: would replace username account with numeric account');
            }
            continue;
          }
          if (mergeMode === 'sum') {
            const sum = (existing.balance || 0) + (doc.balance || 0);
            console.log(`  merge=sum: username balance=${existing.balance} + numeric balance=${doc.balance} => ${sum}`);
            if (apply) {
              await BankAccount.updateOne({ userId: username }, { $set: { balance: sum }, $currentDate: { updatedAt: true } });
              await BankAccount.deleteOne({ _id: doc._id });
              await TransactionLog.create([{ type: 'transfer', from: numericKey, to: username, amount: doc.balance || 0, meta: { migration: true, mode: 'sum', direction: 'numeric->username' } }]);
              console.log('  Applied sum merge: numeric account removed, username account updated');
            } else {
              console.log('  DRY-RUN: would sum balances and remove numeric account');
            }
            continue;
          }
          console.log('  Unknown merge mode; skipping');
        }
      }
    }

    console.log('\nMigration completed (dry-run if --apply not provided).');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
