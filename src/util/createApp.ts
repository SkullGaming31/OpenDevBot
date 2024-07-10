import axios from 'axios';
import express from 'express';
import { TokenModel } from '../database/models/tokenModel';

export default function createApp(): express.Application {
	const app = express();

	const port = process.env.PORT || 3000;

	const clientId = process.env.TWITCH_CLIENT_ID as string;
	const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;
	const redirectUri = process.env.TWITCH_REDIRECT_URL as string;

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
		'user:read:subscriptions'
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

	// https://id.twitch.tv/oauth2/authorize?client_id=4qhq6yv4vbpy6yp4jagdlx7olozrnx&redirect_uri=http://localhost:3000/api/v1/auth/twitch/callback&response_type=code&scope=bits:read+channel:edit:commercial+channel:manage:broadcast+channel:manage:extensions+channel:manage:guest_star+channel:manage:moderators+channel:manage:polls+channel:manage:predictions+channel:manage:raids+channel:manage:redemptions+channel:manage:schedule+channel:manage:videos+channel:manage:vips+channel:read:charity+channel:read:editors+channel:read:goals+channel:read:guest_star+channel:read:hype_train+channel:read:polls+channel:read:predictions+channel:read:redemptions+channel:read:subscriptions+channel:read:vips+chat:edit+chat:read+clips:edit+moderation:read+moderator:manage:announcements+moderator:manage:automod+moderator:manage:automod_settings+moderator:manage:banned_users+moderator:manage:blocked_terms+moderator:manage:chat_messages+moderator:manage:chat_settings+moderator:manage:guest_star+moderator:manage:shield_mode+moderator:manage:shoutouts+moderator:read:automod_settings+moderator:read:blocked_terms+moderator:read:chat_settings+moderator:read:chatters+moderator:read:followers+moderator:read:guest_star+moderator:read:shield_mode+moderator:read:shoutouts+user:edit+user:manage:blocked_users+user:manage:chat_color+user:manage:whispers+user:read:blocked_users+user:read:email+user:read:follows+user:read:subscriptions+whispers:edit+whispers:read

	// Step 1: Redirect to Twitch for authorization
	app.get('/api/v1/twitch', (req: express.Request, res: express.Response) => {
		console.log('Redirect URI:', redirectUri); // Log the redirect URI
		const userAuthorizeUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${userScopes}`;
		const botAuthURL = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${botScopes}`;
		res.redirect(userAuthorizeUrl);
	});

	// Step 2: Handle the OAuth2 callback from Twitch
	app.get('/api/v1/auth/twitch/callback', async (req: express.Request, res: express.Response) => {
		const { code } = req.query;

		if (code) {
			try {
				// Exchange authorization code for access token and refresh token
				const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
					params: {
						client_id: clientId,
						client_secret: clientSecret,
						code,
						grant_type: 'authorization_code',
						redirect_uri: redirectUri // Use the same redirectUri as before
					}
				});

				const { access_token, refresh_token, expires_in } = tokenResponse.data;
				console.log('Token Response: ', tokenResponse.data);

				// Get user ID using the access token
				const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
					headers: {
						'Authorization': `Bearer ${access_token}`,
						'Client-Id': clientId
					}
				});
				console.log('UserResponse: ', userResponse.data);

				const userId = userResponse.data.data[0].id;
				const username = userResponse.data.data[0].login;
				const broadcaster_type = userResponse.data.data[0].broadcaster_type || 'streamer';
				const obtainmentTimestamp = Date.now();

				// Check if token already exists in MongoDB
				let tokenDoc = await TokenModel.findOne({ user_id: userId });
				if (!tokenDoc) {
					// If no token is found, create a new one
					tokenDoc = new TokenModel({
						user_id: userId,
						login: username,
						access_token,
						refresh_token,
						scope: userScopes.split('+'),
						expires_in,
						obtainmentTimestamp,
						broadcaster_type
					});
				} else {
					// If token is found, update it
					tokenDoc.login = username;
					tokenDoc.access_token = access_token;
					tokenDoc.refresh_token = refresh_token;
					tokenDoc.scope = userScopes.split('+');
					tokenDoc.expires_in = expires_in;
					tokenDoc.obtainmentTimestamp = obtainmentTimestamp;
					tokenDoc.broadcaster_type = broadcaster_type;
				}

				// Save the token document
				await tokenDoc.save();
				console.log('Token Saved/Updated');

				res.json({ 
					username: username,
					access_token, 
					refresh_token,
					expires_in,
					broadcaster_type: broadcaster_type === '' ? 'streamer' : broadcaster_type 
				});
			} catch (error) {
				console.error('Error during OAuth2 process:', error);
				res.status(500).send('Error during OAuth2 process');
			}
		} else {
			res.status(400).send('No authorization code provided');
		}
	});

	return app;
}