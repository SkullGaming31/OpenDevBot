#!/usr/bin/env node
// Dumps usertokens matching a provided userId or lists all tokens (up to 200)
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';
(async () => {
  const args = process.argv.slice(2);
  const userId = args[0];
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('usertokens');
    const query = userId ? { user_id: String(userId) } : {};
    const count = await col.countDocuments(query);
    console.log('Matched usertokens:', count);
    const docs = await col.find(query).limit(200).toArray();
    for (const d of docs) {
      console.log(JSON.stringify({ user_id: d.user_id, login: d.login, scope: d.scope }));
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
