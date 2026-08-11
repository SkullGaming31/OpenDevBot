require('dotenv').config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';
(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('eventsubscriptionretries');
    const total = await col.countDocuments();
    const agg = await col.aggregate([
      { $group: { _id: { status: '$status' }, count: { $sum: 1 } } },
      { $project: { status: '$_id.status', count: 1, _id: 0 } }
    ]).toArray();
    const latest = await col.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log('total retries', total);
    console.log('by status', JSON.stringify(agg, null, 2));
    console.log('latest 10', JSON.stringify(latest.map(s => ({ subscriptionId: s.subscriptionId, authUserId: s.authUserId, attempts: s.attempts, status: s.status })), null, 2));
  } catch (e) {
    console.error('err', e);
  } finally {
    await client.close();
  }
})();
