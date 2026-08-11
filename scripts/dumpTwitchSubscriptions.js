#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function getAppAccessToken(clientId, clientSecret) {
  const url = 'https://id.twitch.tv/oauth2/token';
  const resp = await axios.post(url, null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }
  });
  return resp.data.access_token;
}

async function fetchAllSubscriptions(accessToken, clientId) {
  const all = [];
  let cursor = undefined;
  while (true) {
    const params = { first: 100 };
    if (cursor) params.after = cursor;
    const resp = await axios.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': clientId
      },
      params
    });
    const rows = Array.isArray(resp.data?.data) ? resp.data.data : [];
    all.push(...rows);
    const nextCursor = resp.data?.pagination?.cursor;
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return all;
}

(async () => {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error('TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing from environment');
      process.exit(2);
    }

    console.log('Requesting app access token...');
    const token = await getAppAccessToken(clientId, clientSecret);
    console.log('Fetching subscriptions (may paginate)...');
    const subs = await fetchAllSubscriptions(token, clientId);
    const outDir = path.join(__dirname, '..', 'tmp');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) { }
    const outPath = path.join(outDir, 'eventsub_subscriptions.json');
    fs.writeFileSync(outPath, JSON.stringify(subs, null, 2), 'utf8');
    console.log(`Fetched ${subs.length} subscriptions. Saved to ${outPath}`);
    const enabled = subs.filter(s => String(s.status || '').toLowerCase() === 'enabled');
    console.log(`Enabled subscriptions: ${enabled.length}`);
  } catch (err) {
    console.error('Failed to fetch subscriptions:', err?.response?.data ?? err.message ?? err);
    process.exit(1);
  }
})();
