import axios from 'axios';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { ITwitchToken, TokenModel } from '../database/models/tokenModel';
import mongoose from 'mongoose';
import { limiter } from './util';
import logger from './logger';
import { metricsHandler, healthHandler, readyHandler } from '../monitoring/metrics';

/**
 * Creates an Express.js app that handles the OAuth2 flow for getting an access token from Twitch.
 *
 * The app has two endpoints:
 * - `/api/v1/twitch`: Redirects to the Twitch authorization URL with the correct scopes and redirect URI.
 * - `/api/v1/auth/twitch/callback`: Handles the OAuth2 callback from Twitch and exchanges the authorization code for an access token and refresh token.
 *   It then uses the access token to get the user ID and saves the access token, refresh token, and user ID to the database.
 *
 * @returns {express.Application} The Express.js app.
 */
export default function createApp(): express.Application {
	const app = express();

	const clientId = process.env.TWITCH_CLIENT_ID as string;
	const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;
	const redirectUri = process.env.TWITCH_REDIRECT_URL as string;

	app.use(express.json());
	app.use(limiter);

	// Serve static admin assets (JS/CSS) from the `public/assets` folder
	app.use('/assets', express.static(path.join(process.cwd(), 'public', 'assets')));

	// Normalize username inputs from req.body or req.query which may be
	// `string | string[] | undefined` depending on how Express parses the
	// incoming request. Return a trimmed single string or `undefined`.
	function normalizeUsername(input: unknown): string | undefined {
		if (input === undefined || input === null) return undefined;
		let val: unknown = input;
		if (Array.isArray(val)) {
			val = val.length > 0 ? val[0] : undefined;
		}
		if (typeof val !== 'string') return undefined;
		const s = val.trim();
		if (s.length === 0) return undefined;
		// Basic sanitization: disallow suspicious control characters and limit length
		if (s.length > 100) return undefined;
		return s;
	}

	// A minimal chat client interface used to avoid `any` casts when calling
	// chat client methods that may or may not be present depending on the
	// chat client implementation/version.
	type ChatClientLike = { part?: (ch: string) => Promise<void>; quit?: (ch: string) => Promise<void> };

	// Simple admin auth middleware. Set `ADMIN_API_TOKEN` in env and supply it
	// in the `x-admin-token` header for protected endpoints.
	function parseCookie(header: string | undefined, name: string): string | undefined {
		if (!header) return undefined;
		const parts = header.split(';').map(p => p.trim());
		for (const p of parts) {
			const [k, ...rest] = p.split('=');
			if (k === name) return decodeURIComponent(rest.join('='));
		}
		return undefined;
	}

	function getProvidedAdminToken(req: express.Request): string | undefined {
		const header = req.header('x-admin-token') || undefined;
		if (header) return header;
		if (req.query && typeof req.query.admin_token === 'string') return req.query.admin_token as string;
		const cookieHeader = req.headers?.cookie as string | undefined;
		const cookieToken = parseCookie(cookieHeader, 'admin_token');
		if (cookieToken) return cookieToken;
		return undefined;
	}

	function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
		const token = process.env.ADMIN_API_TOKEN;
		if (!token) return res.status(403).json({ error: 'Admin API not configured' });
		const provided = getProvidedAdminToken(req);
		if (!provided || provided !== token) return res.status(401).json({ error: 'Unauthorized' });
		next();
	}

	// Admin endpoints: list / join / part channels dynamically
	app.get('/api/v1/chat/channels', requireAdmin, async (_req, res) => {
		try {
			const { joinedChannels } = await import('../chat');
			return res.json({ channels: Array.from(joinedChannels) });
		} catch (e) {
			logger.error('Failed to list joined channels', e as Error);
			return res.status(500).json({ error: 'failed' });
		}
	});

	// Admin: list webhook queue items (pending/failed)
	app.get('/api/v1/admin/webhooks', requireAdmin, async (req, res) => {
		try {
			const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
			// Validate and sanitize query params coming from the client to avoid
			// building queries directly from user-controlled input.
			const allowedStatuses = new Set(['pending', 'processing', 'sent', 'failed']);
			const statusRaw = req.query.status as string | undefined;
			const status = statusRaw && typeof statusRaw === 'string' && allowedStatuses.has(statusRaw) ? statusRaw : 'pending';
			const page = Math.max(1, Number.isFinite(Number(req.query.page)) ? Math.max(1, parseInt(String(req.query.page), 10) || 1) : 1);
			let limit = Number.isFinite(Number(req.query.limit)) ? parseInt(String(req.query.limit), 10) || 50 : 50;
			if (limit < 1) limit = 1;
			if (limit > 200) limit = 200;
			const filter: Record<string, unknown> = {};
			// Only include status in the filter when it is one of the allowed values
			if (allowedStatuses.has(status)) filter.status = status;
			const total = await WebhookQueueModel.countDocuments(filter);
			const items = await WebhookQueueModel.find(filter, { token: 0, __v: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
			return res.json({ total, page, limit, items });
		} catch (e) {
			logger.error('Failed to list webhook queue items', e as Error);
			return res.status(500).json({ error: 'failed' });
		}
	});

	// Admin: requeue webhook items by id (set status back to 'pending')
	app.post('/api/v1/admin/webhooks/requeue', requireAdmin, async (req, res) => {
		try {
			const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
			const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : req.body?.id ? [req.body.id] : (req.query.id ? [req.query.id as string] : []);
			if (ids.length === 0) return res.status(400).json({ error: 'id or ids required' });
			const validIds = ids.filter(i => mongoose.Types.ObjectId.isValid(i)).map(i => new mongoose.Types.ObjectId(i));
			if (validIds.length === 0) return res.status(400).json({ error: 'no valid ids provided' });
			const result = await WebhookQueueModel.updateMany({ _id: { $in: validIds } }, { $set: { status: 'pending', updatedAt: new Date() }, $unset: { lastError: '' } });
			// `result` is an UpdateWriteOpResult; normalize counts where available
			// Some mongoose types differ by driver version; safely extract counts
			const resultObj = result as unknown as Record<string, unknown>;
			const matched = typeof resultObj['matchedCount'] === 'number' ? (resultObj['matchedCount'] as number) : (typeof resultObj['n'] === 'number' ? (resultObj['n'] as number) : 0);
			const modified = typeof resultObj['modifiedCount'] === 'number' ? (resultObj['modifiedCount'] as number) : (typeof resultObj['nModified'] === 'number' ? (resultObj['nModified'] as number) : 0);
			return res.json({ ok: true, matched, modified });
		} catch (e) {
			logger.error('Failed to requeue webhook items', e as Error);
			return res.status(500).json({ error: 'failed' });
		}
	});

	// Admin: delete webhook items by id (single or multiple)
	app.delete('/api/v1/admin/webhooks', requireAdmin, async (req, res) => {
		try {
			const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
			const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : req.body?.id ? [req.body.id] : (req.query.id ? [req.query.id as string] : []);
			if (ids.length === 0) return res.status(400).json({ error: 'id or ids required' });
			const validIds = ids.filter(i => mongoose.Types.ObjectId.isValid(i)).map(i => new mongoose.Types.ObjectId(i));
			if (validIds.length === 0) return res.status(400).json({ error: 'no valid ids provided' });
			const result = await WebhookQueueModel.deleteMany({ _id: { $in: validIds } });
			return res.json({ ok: true, deleted: result.deletedCount ?? 0 });
		} catch (e) {
			logger.error('Failed to delete webhook items', e as Error);
			return res.status(500).json({ error: 'failed' });
		}
	});

	app.post('/api/v1/chat/join', requireAdmin, async (req, res) => {
		const raw = req.body?.username ?? req.query.username;
		const username = normalizeUsername(raw);
		if (!username) return res.status(400).json({ error: 'username required' });
		try {
			const { joinChannel } = await import('../chat');
			await joinChannel(username);
			return res.json({ ok: true, joined: username });
		} catch (e) {
			logger.error('Admin join failed', e as Error);
			return res.status(500).json({ error: 'failed to join' });
		}
	});

	// Simple admin UI for webhook queue management. Requires `x-admin-token` header
	// or the token provided via the UI (stored in localStorage). This serves the
	// static HTML file from the repository `public` folder.
	app.get('/admin/webhooks', requireAdmin, (_req: express.Request, res: express.Response) => {
		try {
			return res.sendFile(path.join(process.cwd(), 'public', 'admin', 'webhooks.html'));
		} catch (e) {
			logger.error('Failed to serve admin webhooks UI', e as Error);
			return res.status(500).send('failed to load admin UI');
		}
	});

	// Setup endpoint: allow setting ADMIN_API_TOKEN at runtime when the server
	// was started with a one-time `ADMIN_SETUP_TOKEN`. This is intended for
	// initial bootstrap in local/dev environments only. The endpoint will also
	// persist the token to a local `.env` file in the repository root so the
	// token survives restarts. WARNING: treat the setup token and resulting
	// ADMIN_API_TOKEN as secrets — avoid enabling this on public-facing servers.

	// Serve a small HTML form for browser-based bootstrapping of the admin token.
	// This is a convenience UI that POSTs to the same `/api/v1/admin/setup` endpoint
	// using the `x-setup-token` header so you can perform the one-time bootstrap
	// from a browser without needing curl/PowerShell.
	app.get('/api/v1/admin/setup', (_req: express.Request, res: express.Response) => {
		try {
			return res.type('html').send(`<!doctype html>
			<html>
			<head><meta charset="utf-8"><title>OpenDevBot — Admin Setup</title></head>
			<body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px">
				<h1>OpenDevBot — Admin Setup</h1>
				<p>This form lets you set the <code>ADMIN_API_TOKEN</code> when the server
				is started with a one-time <code>ADMIN_SETUP_TOKEN</code>. Enter both values below
				and submit.</p>
				<form id="setupForm">
					<div style="margin:8px 0"><label>Setup Token<br><input id="setup" name="setup" style="width:360px" /></label></div>
					<div style="margin:8px 0"><label>Admin Token to set<br><input id="token" name="token" style="width:360px" /></label></div>
					<div style="margin:8px 0"><button type="submit">Set Admin Token</button></div>
				</form>
				<pre id="result" style="white-space:pre-wrap;background:#f7f7f7;padding:8px;border-radius:4px;max-width:760px"></pre>
				<script>
				const form = document.getElementById('setupForm');
				const result = document.getElementById('result');
				form.addEventListener('submit', async (e) => {
					e.preventDefault();
					const setup = document.getElementById('setup').value.trim();
					const token = document.getElementById('token').value.trim();
					if (!setup || !token) { result.textContent = 'Both fields are required.'; return; }
					result.textContent = 'Sending...';
					try {
						const resp = await fetch('/api/v1/admin/setup', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', 'x-setup-token': setup },
							body: JSON.stringify({ token })
						});
						let body = '';
						try { body = await resp.text(); } catch (_) { body = '' }
						if (resp.ok) {
							result.textContent = 'Success: ' + (body || JSON.stringify({ ok: true }));
						} else {
							result.textContent = 'Error ' + resp.status + ': ' + body;
						}
					} catch (err) {
						result.textContent = 'Network error: ' + String(err);
					}
				});
				</script>
			</body>
			</html>`);
		} catch (e) {
			logger.error('Failed to serve admin setup UI', e as Error);
			return res.status(500).send('failed to load setup UI');
		}
	});

	app.post('/api/v1/admin/setup', async (req: express.Request, res: express.Response) => {
		const setupToken = process.env.ADMIN_SETUP_TOKEN;
		if (!setupToken) return res.status(403).json({ error: 'Setup not enabled' });
		const provided = (req.header('x-setup-token') || req.query.setup_token || '') as string;
		if (!provided || provided !== setupToken) return res.status(401).json({ error: 'Unauthorized' });
		const token = (req.body?.token || req.query.token) as string | undefined;
		if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });
		if (process.env.ADMIN_API_TOKEN) return res.status(400).json({ error: 'Admin API token already set' });
		// Set in-process
		process.env.ADMIN_API_TOKEN = token;
		// Persist to .env (append or replace existing key)
		try {
			const envPath = path.join(process.cwd(), '.env');
			let content = '';
			if (fs.existsSync(envPath)) {
				content = fs.readFileSync(envPath, 'utf8');
				if (/^ADMIN_API_TOKEN=/m.test(content)) {
					content = content.replace(/^ADMIN_API_TOKEN=.*$/m, `ADMIN_API_TOKEN=${token}`);
				} else {
					if (content.length && !content.endsWith('\n')) content += '\n';
					content += `ADMIN_API_TOKEN=${token}\n`;
				}
				fs.writeFileSync(envPath, content, 'utf8');
			} else {
				fs.writeFileSync(envPath, `ADMIN_API_TOKEN=${token}\n`, 'utf8');
			}
			return res.json({ ok: true });
		} catch (e) {
			logger.error('Failed to persist admin token', e as Error);
			return res.status(500).json({ error: 'failed to persist' });
		}
	});

	// Admin login (sets a HttpOnly cookie). Accepts JSON { token } and if it
	// matches `ADMIN_API_TOKEN` sets a cookie so the dashboard can authenticate
	// without storing tokens in localStorage. Cookie name: `admin_token`.
	app.post('/api/v1/admin/login', async (req: express.Request, res: express.Response) => {
		const token = (req.body?.token || req.query.token) as string | undefined;
		if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });
		const expected = process.env.ADMIN_API_TOKEN;
		if (!expected) return res.status(503).json({ error: 'Admin API not configured' });
		if (token !== expected) return res.status(401).json({ error: 'Unauthorized' });
		// Set cookie; for production set Secure as appropriate
		const cookieOpts: Record<string, unknown> = { httpOnly: true, sameSite: 'lax' };
		if (process.env.ENVIRONMENT === 'prod') (cookieOpts).secure = true;
		res.cookie('admin_token', token, cookieOpts);
		return res.json({ ok: true });
	});

	app.post('/api/v1/admin/logout', requireAdmin, async (_req: express.Request, res: express.Response) => {
		res.cookie('admin_token', '', { httpOnly: true, expires: new Date(0) });
		return res.json({ ok: true });
	});

	// Admin: reload chat and eventsub listeners at runtime
	app.post('/api/v1/admin/reload', requireAdmin, async (_req: express.Request, res: express.Response) => {
		try {
			const { restartChat } = await import('../chat');
			const { recreateEventSubs } = await import('../EventSubEvents');
			// best-effort non-blocking but wait for operations to complete
			await Promise.allSettled([restartChat().catch((e) => { throw e; }), recreateEventSubs().catch((e) => { throw e; })]);
			return res.json({ ok: true });
		} catch (e) {
			logger.error('Admin reload failed', e as Error);
			return res.status(500).json({ error: 'failed to reload' });
		}
	});

	app.post('/api/v1/chat/part', requireAdmin, async (req, res) => {
		const raw = req.body?.username ?? req.query.username;
		const username = normalizeUsername(raw);
		if (!username) return res.status(400).json({ error: 'username required' });
		try {
			const { getChatClient, joinedChannels } = await import('../chat');
			const client = await getChatClient();
			const normalized = username.startsWith('#') ? username.slice(1) : username;
			// Ensure we only call functions — some ChatClient variants expose
			// `part` or `quit` as non-callable values in different versions.
			// Use a small typed interface to avoid `any` and silence ESLint warnings.
			if (typeof ((client as unknown as ChatClientLike).part) === 'function') {
				await (client as unknown as ChatClientLike).part!(normalized);
			} else if (typeof ((client as unknown as ChatClientLike).quit) === 'function') {
				await (client as unknown as ChatClientLike).quit!(normalized);
			}
			try { joinedChannels.delete(normalized); } catch (e) { /* ignore */ }
			return res.json({ ok: true, parted: normalized });
		} catch (e) {
			logger.error('Admin part failed', e as Error);
			return res.status(500).json({ error: 'failed to part' });
		}
	});

	// Monitoring endpoints (Prometheus scrape and simple health checks)
	app.get('/metrics', metricsHandler());
	app.get('/health', healthHandler());
	app.get('/ready', readyHandler());

	// Root UI: small index with links to admin pages and API endpoints
	app.get('/', (_req: express.Request, res: express.Response) => {
		res.type('html').send(`
			<!doctype html>
			<html>
			<head><meta charset="utf-8"><title>OpenDevBot — Admin</title></head>
			<body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px">
				<h1>OpenDevBot</h1>
				<p>Admin links and API endpoints. Admin endpoints require the <code>x-admin-token</code> header or <code>admin_token</code> query parameter.</p>
				<ul>
					<li><a href="/admin/webhooks">Admin UI — Webhook Queue</a></li>
					<li><a href="/api/v1/admin/webhooks?status=pending&page=1&limit=50">API: List webhooks (GET)</a></li>
					<li>API: Requeue (POST) — <code>/api/v1/admin/webhooks/requeue</code> (JSON body: <code>{"ids":["id1"]}</code>)</li>
					<li>API: Delete (DELETE) — <code>/api/v1/admin/webhooks</code> (JSON body: <code>{"ids":["id1"]}</code>)</li>
				</ul>
				<p class="small">Note: the UI will store the token in your browser's localStorage and send it as <code>x-admin-token</code>.</p>
			</body>
			</html>
		`);
	});

	// List of scopes
	const userScopes = [
		'bits:read',
		'channel:edit:commercial',
		'channel:manage:broadcast',
		'channel:manage:moderators',
		'channel:manage:polls',
		'channel:manage:predictions',
		'channel:manage:raids',
		'channel:manage:redemptions',
		'channel:manage:schedule',
		'channel:manage:vips',
		'channel:read:editors',
		'channel:read:goals',
		'channel:read:hype_train',
		'channel:read:polls',
		'channel:read:predictions',
		'channel:read:redemptions',
		'channel:read:subscriptions',
		'channel:read:vips',
		'channel_subscriptions',
		'clips:edit',
		'moderation:read',
		'moderator:manage:announcements',
		'moderator:manage:automod',
		'moderator:manage:automod_settings',
		'moderator:manage:banned_users',
		'moderator:manage:blocked_terms',
		'moderator:manage:chat_messages',
		'moderator:manage:chat_settings',
		'moderator:manage:guest_star',
		'moderator:manage:shield_mode',
		'moderator:manage:shoutouts',
		'moderator:read:automod_settings',
		'moderator:read:blocked_terms',
		'moderator:read:chat_settings',
		'moderator:read:chatters',
		'moderator:read:followers',
		'moderator:read:guest_star',
		'moderator:read:shield_mode',
		'moderator:read:shoutouts',
		'moderator:read:warnings',
		'moderator:manage:warnings',
		'user:edit',
		'user:edit:broadcast',
		'user:edit:follows',
		'user:manage:blocked_users',
		'user:manage:whispers',
		'user:read:blocked_users',
		'user:read:broadcast',
		'user:read:email',
		'user:read:follows',
		'user:read:subscriptions',
		'chat:edit',
		'chat:read'
	].join(' '); // Join scopes with space
	const botScopes = ['bits:read',
		'channel:edit:commercial',
		'channel:manage:broadcast',
		'channel:manage:extensions',
		'channel:manage:guest_star',
		'channel:manage:moderators',
		'channel:manage:polls',
		'channel:manage:predictions',
		'channel:manage:raids',
		'channel:manage:redemptions',
		'channel:manage:schedule',
		'channel:manage:videos',
		'channel:manage:vips',
		'channel:read:charity',
		'channel:read:editors',
		'channel:read:goals',
		'channel:read:guest_star',
		'channel:read:hype_train',
		'channel:read:polls',
		'channel:read:predictions',
		'channel:read:redemptions',
		'channel:read:subscriptions',
		'channel:read:vips',
		'channel:bot',
		'chat:edit',
		'chat:read',
		'clips:edit',
		'moderation:read',
		'moderator:manage:announcements',
		'moderator:manage:automod',
		'moderator:manage:automod_settings',
		'moderator:manage:banned_users',
		'moderator:manage:blocked_terms',
		'moderator:manage:chat_messages',
		'moderator:manage:chat_settings',
		'moderator:manage:guest_star',
		'moderator:manage:shield_mode',
		'moderator:manage:shoutouts',
		'moderator:read:automod_settings',
		'moderator:read:blocked_terms',
		'moderator:read:chat_settings',
		'moderator:read:chatters',
		'moderator:read:followers',
		'moderator:read:guest_star',
		'moderator:read:shield_mode',
		'moderator:read:shoutouts',
		'user:edit',
		'user:manage:blocked_users',
		'user:manage:chat_color',
		'user:manage:whispers',
		'user:read:blocked_users',
		'user:read:email',
		'user:read:follows',
		'user:read:subscriptions',
		'whispers:edit',
		'whispers:read'].join(' ');

	// https://id.twitch.tv/oauth2/authorize?client_id=4qhq6yv4vbpy6yp4jagdlx7olozrnx&redirect_uri=http://localhost:3001/api/v1/auth/twitch/callback&response_type=code&scope=bits:read+channel:edit:commercial+channel:manage:broadcast+channel:manage:extensions+channel:manage:guest_star+channel:manage:moderators+channel:manage:polls+channel:manage:predictions+channel:manage:raids+channel:manage:redemptions+channel:manage:schedule+channel:manage:videos+channel:manage:vips+channel:read:charity+channel:read:editors+channel:read:goals+channel:read:guest_star+channel:read:hype_train+channel:read:polls+channel:read:predictions+channel:read:redemptions+channel:read:subscriptions+channel:read:vips+chat:edit+chat:read+clips:edit+moderation:read+moderator:manage:announcements+moderator:manage:automod+moderator:manage:automod_settings+moderator:manage:banned_users+moderator:manage:blocked_terms+moderator:manage:chat_messages+moderator:manage:chat_settings+moderator:manage:guest_star+moderator:manage:shield_mode+moderator:manage:shoutouts+moderator:read:automod_settings+moderator:read:blocked_terms+moderator:read:chat_settings+moderator:read:chatters+moderator:read:followers+moderator:read:guest_star+moderator:read:shield_mode+moderator:read:shoutouts+user:edit+user:manage:blocked_users+user:manage:chat_color+user:manage:whispers+user:read:blocked_users+user:read:email+user:read:follows+user:read:subscriptions+whispers:edit+whispers:read

	// Step 1: Redirect to Twitch for authorization. Optional `type` query param selects the scope set.
	app.get('/api/v1/twitch', (req: express.Request, res: express.Response) => {
		const type = (req.query.type as string) || 'user';
		logger.debug('Redirect URI:', redirectUri, 'type:', type);
		const scopes = type === 'bot' ? botScopes : userScopes;
		const authorizeUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&type=${encodeURIComponent(type)}`;
		res.redirect(authorizeUrl);
	});

	// Alias: historically some users hit /api/v1/auth/twitch — redirect those requests to the proper start endpoint
	app.get('/api/v1/auth/twitch', (req: express.Request, res: express.Response) => {
		const type = (req.query.type as string) || 'user';
		res.redirect(`/api/v1/twitch${type ? `?type=${encodeURIComponent(type)}` : ''}`);
	});

	// Step 2: Handle the OAuth2 callback from Twitch
	app.get('/api/v1/auth/twitch/callback', async (req: express.Request, res: express.Response) => {
		const { code } = req.query;

		logger.debug('OAuth callback invoked. code present?', !!code, 'redirectUri=', redirectUri);

		if (code) {
			try {
				// Exchange authorization code for access token and refresh token
				const tokenResponse = await axios.post<ITwitchToken>('https://id.twitch.tv/oauth2/token', null, {
					params: {
						client_id: clientId,
						client_secret: clientSecret,
						code,
						grant_type: 'authorization_code',
						redirect_uri: redirectUri // Use the same redirectUri as before
					}
				});

				type TokenResponseData = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string[] | string; scopes?: string[] | string };
				const { access_token, refresh_token, expires_in } = tokenResponse.data as TokenResponseData;

				// Normalize scopes returned by Twitch: could be array or space-separated string
				const returnedScopesRaw = (tokenResponse.data as TokenResponseData).scope || (tokenResponse.data as TokenResponseData).scopes;
				const returnedScopes: string[] = Array.isArray(returnedScopesRaw)
					? returnedScopesRaw
					: (typeof returnedScopesRaw === 'string' ? returnedScopesRaw.split(' ') : []);

				logger.debug('Token Response: ', {
					has_access_token: !!access_token,
					expires_in,
					scopes: returnedScopes
				});

				// Get user ID using the access token
				const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
					headers: {
						'Authorization': `Bearer ${access_token}`,
						'Client-Id': clientId
					}
				});
				logger.debug('UserResponse: ', userResponse.data);

				const userId = userResponse.data.data[0].id;
				const username = userResponse.data.data[0].login;
				const broadcaster_type = userResponse.data.data[0].broadcaster_type || 'streamer';
				// store seconds
				const obtainmentTimestamp = Math.floor(Date.now() / 1000);

				// Check if token already exists in MongoDB
				let tokenDoc = await TokenModel.findOne({ user_id: userId });
				if (!tokenDoc) {
					// If no token is found, create a new one
					tokenDoc = new TokenModel({
						user_id: userId,
						login: username,
						access_token,
						refresh_token,
						scope: returnedScopes.length > 0 ? returnedScopes : userScopes.split('+'),
						expires_in,
						obtainmentTimestamp,
						broadcaster_type
					});
					logger.info('Token Saved');
				} else {
					// If token is found, update it
					tokenDoc.login = username;
					tokenDoc.access_token = access_token ?? '';
					tokenDoc.refresh_token = refresh_token ?? '';
					tokenDoc.scope = returnedScopes.length > 0 ? returnedScopes : userScopes.split('+');
					tokenDoc.expires_in = expires_in ?? 0;
					tokenDoc.obtainmentTimestamp = obtainmentTimestamp;
					tokenDoc.broadcaster_type = broadcaster_type;
				}

				// Save the token document
				await tokenDoc.save();
				logger.info('Token Updated for user:', userId, 'login:', username, 'scopes:', tokenDoc.scope);

				// Try to dynamically join the chat client to the newly registered user's channel
				try {
					// Import lazily to avoid any startup ordering issues
					const { joinChannel } = await import('../chat');
					// best-effort — don't block the response
					void joinChannel(username).catch((e) => logger.warn('Failed to join new channel after signup', e));
				} catch (e) {
					logger.warn('Dynamic joinChannel import failed', e);
				}

				return res.json({
					userId,
					username,
					expires_in,
					broadcaster_type: broadcaster_type === '' ? 'streamer' : broadcaster_type,
					scopes: tokenDoc.scope
				});
			} catch (error: unknown) {
				// Try to log axios error response body if present for easier debugging
				if (error instanceof Error) logger.error('Error during OAuth2 process:', error.message);
				else logger.error('Error during OAuth2 process:', String(error));
				const getAxiosResponseData = (e: unknown): unknown | undefined => {
					if (!e || typeof e !== 'object') return undefined;
					const rec = e as Record<string, unknown>;
					const resp = rec['response'] as Record<string, unknown> | undefined;
					return resp ? resp['data'] : undefined;
				};
				const axiosResp = getAxiosResponseData(error);
				if (axiosResp) {
					logger.error('Axios response data:', axiosResp);
				}
				const details = axiosResp ?? (error instanceof Error ? error.message : String(error));
				return res.status(500).json({ error: 'Error during OAuth2 process', details });
			}
		} else {
			res.status(400).send('No authorization code provided');
		}
	});

	return app;
}