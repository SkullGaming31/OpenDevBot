#!/usr/bin/env node
// Usage: node scripts/resetRetry.js <subscriptionId> <authUserId> [--set attempts]
// Example: node scripts/resetRetry.js "channel.raid.to.1155035316" 1155035316 --set 0

const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/resetRetry.js <subscriptionId> <authUserId> [--set attempts]');
    process.exit(2);
  }
  const [subscriptionId, authUserId] = args;
  const setIndex = args.indexOf('--set');
  const setValue = setIndex !== -1 && args.length > setIndex + 1 ? Number(args[setIndex + 1]) : null;

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('eventsubscriptionretries');
    const filter = { subscriptionId: String(subscriptionId), authUserId: String(authUserId) };
    const doc = await col.findOne(filter);
    if (!doc) {
      console.error('No retry record found for', filter);
      process.exit(1);
    }
    console.log('Current record:', doc);
    const update = {};
    if (setValue !== null) {
      update.$set = { attempts: Number(setValue), lastError: '', status: 'pending', nextRetryAt: new Date() };
    } else {
      // Default: delete the retry record
      const del = await col.deleteOne(filter);
      console.log('Deleted documents:', del.deletedCount);
      process.exit(0);
    }
    const r = await col.updateOne(filter, update);
    console.log('Modified count:', r.modifiedCount);
    const after = await col.findOne(filter);
    console.log('After:', after);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
