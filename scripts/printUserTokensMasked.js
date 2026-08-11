require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';
(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const arr = await db.collection('usertokens').find({}).toArray();
    const masked = arr.map(doc => {
      const access = doc.access_token || doc.accessToken || null;
      const maskedToken = access ? (typeof access === 'string' ? access.substring(0, 6) + '...' : '<non-string>') : null;
      return {
        _id: doc._id,
        user_id: doc.user_id || doc.userId || doc.id || null,
        login: doc.login || doc.username || null,
        scope: doc.scope || doc.scopes || null,
        access_token_masked: maskedToken,
        expires_at: doc.expires_at || doc.expiresAt || null
      };
    });
    console.log('count', masked.length);
    console.log(JSON.stringify(masked, null, 2));
  } catch (e) {
    console.error('err', e);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
