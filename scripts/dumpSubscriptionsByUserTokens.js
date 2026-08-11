#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

(async () => {
  const out = [];
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('usertokens');
    const docs = await col.find({}).toArray();
    console.log(`Found ${docs.length} user tokens in DB`);
    for (const d of docs) {
      const userId = String(d.user_id ?? '');
      const login = String(d.login ?? '');
      const scope = d.scope ?? null;
      const access = d.access_token ?? d.accessToken ?? null;
      if (!access) {
        console.log(`Skipping ${userId} (${login}) - no access token`);
        out.push({ userId, login, scope, subscriptions: null, note: 'no token' });
        continue;
      }
      try {
        console.log(`Querying subscriptions for ${userId} (${login})`);
        const subs = [];
        let cursor = undefined;
        while (true) {
          const params = { first: 100 };
          if (cursor) params.after = cursor;
          const resp = await axios.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
            headers: {
              Authorization: `Bearer ${access}`,
              'Client-Id': process.env.TWITCH_CLIENT_ID,
            },
            params
          });
          const rows = Array.isArray(resp.data?.data) ? resp.data.data : [];
          subs.push(...rows);
          const nextCursor = resp.data?.pagination?.cursor;
          if (!nextCursor) break;
          cursor = nextCursor;
        }
        out.push({ userId, login, scope, subscriptions: subs });
      } catch (err) {
        console.error(`Failed to query for ${userId} (${login})`, err?.response?.data ?? err.message ?? err);
        out.push({ userId, login, scope, subscriptions: null, error: String(err?.response?.data ?? err.message ?? err) });
      }
    }
    const outDir = path.join(__dirname, '..', 'tmp');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) { }
    const outPath = path.join(outDir, 'subscriptions_by_token.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log(`Wrote results to ${outPath}`);
  } catch (err) {
    console.error('Failed', err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
