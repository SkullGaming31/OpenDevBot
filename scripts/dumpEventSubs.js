#!/usr/bin/env node
// Dumps up to N documents from eventsubscriptions for inspection
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';
(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('eventsubscriptions');
    const count = await col.countDocuments();
    console.log('Total eventsubscriptions:', count);
    const docs = await col.find({}).limit(200).toArray();
    for (const d of docs) console.log(JSON.stringify(d));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
