#!/usr/bin/env node
// Usage: node scripts/deleteEventSubs.js <authUserId>
// Example: node scripts/deleteEventSubs.js 1155035316

const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/deleteEventSubs.js <authUserId>');
    process.exit(2);
  }
  const [authUserId] = args;

  // Use the modern MongoClient constructor without deprecated options
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const subsCol = db.collection('eventsubscriptions');
    const retriesCol = db.collection('eventsubscriptionretries');

    // Find matching subscriptions (either authUserId matches or subscriptionId ends with .<id>)
    const byAuth = { authUserId: String(authUserId) };
    const bySuffix = { subscriptionId: new RegExp(`\\.${authUserId}$`) };

    const subsToDelete = await subsCol.find({ $or: [byAuth, bySuffix] }).toArray();
    console.log(`Found ${subsToDelete.length} subscription(s) matching authUserId=${authUserId}`);
    if (subsToDelete.length > 0) console.log(subsToDelete.map(s => s.subscriptionId).join('\n'));

    const confirm = process.env.CONFIRM || false;
    if (!confirm) {
      console.log('\nTo actually delete these records, rerun with env var CONFIRM=1');
      process.exit(0);
    }

    const delSubs = await subsCol.deleteMany({ $or: [byAuth, bySuffix] });
    const delRetries = await retriesCol.deleteMany({ $or: [byAuth, bySuffix] });

    console.log(`Deleted subscriptions: ${delSubs.deletedCount}`);
    console.log(`Deleted retries: ${delRetries.deletedCount}`);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
