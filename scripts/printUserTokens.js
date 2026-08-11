require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';
(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const arr = await db.collection('usertokens').find({}).project({ user_id: 1, login: 1, access_token: 1, accessToken: 1 }).toArray();
    console.log('count', arr.length);
    console.log(JSON.stringify(arr, null, 2));
  } catch (e) {
    console.error('err', e);
  } finally {
    await client.close();
  }
})();
