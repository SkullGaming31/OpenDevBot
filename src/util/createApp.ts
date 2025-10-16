import axios from 'axios';
import express from 'express';
import { ITwitchToken, TokenModel } from '../database/models/tokenModel';
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

	const port = process.env.PORT || 3000;

	const clientId = process.env.TWITCH_CLIENT_ID as string;
	const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;
	const redirectUri = process.env.TWITCH_REDIRECT_URL as string;

	app.use(express.json());
	app.use(limiter);

	// Monitoring endpoints (Prometheus scrape and simple health checks)
	app.get('/metrics', metricsHandler());
	app.get('/health', healthHandler());
	app.get('/ready', readyHandler());

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
	].join('+'); // Join scopes with '+'
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
		'whispers:read'].join('+');

	// https://id.twitch.tv/oauth2/authorize?client_id=4qhq6yv4vbpy6yp4jagdlx7olozrnx&redirect_uri=http://localhost:3001/api/v1/auth/twitch/callback&response_type=code&scope=bits:read+channel:edit:commercial+channel:manage:broadcast+channel:manage:extensions+channel:manage:guest_star+channel:manage:moderators+channel:manage:polls+channel:manage:predictions+channel:manage:raids+channel:manage:redemptions+channel:manage:schedule+channel:manage:videos+channel:manage:vips+channel:read:charity+channel:read:editors+channel:read:goals+channel:read:guest_star+channel:read:hype_train+channel:read:polls+channel:read:predictions+channel:read:redemptions+channel:read:subscriptions+channel:read:vips+chat:edit+chat:read+clips:edit+moderation:read+moderator:manage:announcements+moderator:manage:automod+moderator:manage:automod_settings+moderator:manage:banned_users+moderator:manage:blocked_terms+moderator:manage:chat_messages+moderator:manage:chat_settings+moderator:manage:guest_star+moderator:manage:shield_mode+moderator:manage:shoutouts+moderator:read:automod_settings+moderator:read:blocked_terms+moderator:read:chat_settings+moderator:read:chatters+moderator:read:followers+moderator:read:guest_star+moderator:read:shield_mode+moderator:read:shoutouts+user:edit+user:manage:blocked_users+user:manage:chat_color+user:manage:whispers+user:read:blocked_users+user:read:email+user:read:follows+user:read:subscriptions+whispers:edit+whispers:read

	// Step 1: Redirect to Twitch for authorization. Optional `type` query param selects the scope set.
	app.get('/api/v1/twitch', (req: express.Request, res: express.Response) => {
		const type = (req.query.type as string) || 'user';
		logger.debug('Redirect URI:', redirectUri, 'type:', type); // Log the redirect URI and type
		const scopes = type === 'bot' ? botScopes : userScopes;
		const authorizeUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}`;
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