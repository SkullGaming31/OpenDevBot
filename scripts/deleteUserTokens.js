#!/usr/bin/env node
// Usage: node scripts/deleteUserTokens.js <userId>
// Example: node scripts/deleteUserTokens.js 1155035316

const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/deleteUserTokens.js <userId>');
    process.exit(2);
  }
  const [userId] = args;

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('usertokens');

    const filter = { user_id: String(userId) };
    const doc = await col.findOne(filter);
    if (!doc) {
      console.error('No user token found for', userId);
      process.exit(1);
    }
    console.log('Found user token:', { user_id: doc.user_id, login: doc.login });

    const confirm = process.env.CONFIRM || false;
    if (!confirm) {
      console.log('\nTo actually delete this token, rerun with env var CONFIRM=1');
      process.exit(0);
    }

    const res = await col.deleteOne(filter);
    console.log('Deleted tokens:', res.deletedCount);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
