#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');

const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function fetchSubs(accessToken, clientId) {
  const all = [];
  let cursor;
  while (true) {
    const params = { first: 100 };
    if (cursor) params.after = cursor;
    const resp = await axios.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
      headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId },
      params,
    });
    const rows = Array.isArray(resp.data?.data) ? resp.data.data : [];
    all.push(...rows);
    const next = resp.data?.pagination?.cursor;
    if (!next) break;
    cursor = next;
  }
  return all;
}

async function deleteSub(id, accessToken, clientId) {
  const resp = await axios.delete('https://api.twitch.tv/helix/eventsub/subscriptions', {
    headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId },
    params: { id },
  });
  return resp.status;
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/deleteTwitchDisconnectedSubs.js <authUserId>');
    process.exit(2);
  }
  const authUserId = String(args[0]);
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('usertokens');
    // Support user_id stored as number or string, or lookup by login
    const tokenDoc = await col.findOne({ $or: [{ user_id: authUserId }, { user_id: Number(authUserId) }, { login: authUserId }] });
    if (!tokenDoc) {
      console.error('No token found for', authUserId);
      process.exit(1);
    }
    const access = tokenDoc.access_token || tokenDoc.accessToken;
    if (!access) {
      console.error('No access token available for', authUserId);
      process.exit(1);
    }
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      console.error('TWITCH_CLIENT_ID missing in .env');
      process.exit(2);
    }

    console.log('Fetching subscriptions from Twitch for', authUserId);
    const subs = await fetchSubs(access, clientId);
    const disconnected = subs.filter(s => String(s.status).toLowerCase() === 'websocket_disconnected');
    console.log(`Found ${subs.length} subscriptions, ${disconnected.length} websocket_disconnected`);
    if (disconnected.length === 0) process.exit(0);
    console.log(disconnected.map(s => `${s.id} ${s.type} ${s.status}`).join('\n'));

    if (!process.env.CONFIRM) {
      console.log('Re-run with CONFIRM=1 in environment to actually delete these');
      process.exit(0);
    }

    for (const s of disconnected) {
      try {
        const status = await deleteSub(s.id, access, clientId);
        console.log(`Deleted ${s.id} -> status ${status}`);
      } catch (e) {
        console.error(`Failed to delete ${s.id}`, e?.response?.data ?? e.message ?? e);
      }
    }
  } catch (e) {
    console.error('Error', e);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
