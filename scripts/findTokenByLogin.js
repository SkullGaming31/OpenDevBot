require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';
(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const q = { login: { $regex: /^skullgaminghq$/i } };
    const arr = await db.collection('usertokens').find(q).toArray();
    console.log('matches', arr.length);
    console.log(JSON.stringify(arr, null, 2));
  } catch (e) {
    console.error('err', e);
  } finally {
    await client.close();
  }
})();
