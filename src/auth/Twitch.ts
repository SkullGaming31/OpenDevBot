
import axios, { AxiosResponse } from 'axios';
import { Request, Response, Router } from 'express';
import { IToken, TokenModel } from '../database/models/tokenModel';

interface validate {
	client_id: string,
  login: string,
  scopes: string[],
  user_id: string,
  expires_in: number
}

// Define the model for access tokens

// Twitch API configuration
const twitchClientId = process.env.TWITCH_CLIENT_ID as string;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET as string;
const twitchRedirectUri = 'http://localhost:8000/auth/twitch/callback';
const botScopes = 'chat:edit chat:read channel:moderate bits:read user:edit channel:manage:schedule channel:manage:redemptions channel:read:charity channel:edit:commercial channel:manage:broadcast channel:manage:moderators channel:manage:polls channel:manage:predictions channel:manage:raids channel:read:editors channel:read:goals channel:read:hype_train channel:read:polls channel:read:predictions channel:read:redemptions channel:read:subscriptions channel:read:vips channel:manage:vips clips:edit moderation:read moderator:manage:automod moderator:manage:automod_settings moderator:manage:banned_users moderator:manage:shield_mode moderator:manage:announcements moderator:manage:shoutouts moderator:manage:blocked_terms moderator:manage:chat_messages moderator:manage:chat_settings moderator:manage:guest_star moderator:read:automod_settings moderator:read:blocked_terms moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode moderator:read:chat_settings moderator:read:chatters moderator:read:guest_star user:manage:whispers';
const userScopes = 'bits:read channel:edit:commercial channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:moderators channel:manage:raids channel:manage:vips channel:read:vips channel:read:polls channel:read:predictions channel:read:redemptions channel:read:editors channel:read:goals channel:read:hype_train channel:read:subscriptions channel_subscriptions clips:edit moderation:read moderator:manage:automod moderator:manage:automod_settings moderator:manage:banned_users moderator:manage:shield_mode moderator:manage:announcements moderator:manage:shoutouts moderator:manage:blocked_terms moderator:manage:chat_messages moderator:manage:chat_settings moderator:manage:guest_star moderator:read:automod_settings moderator:read:blocked_terms moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode moderator:read:chat_settings moderator:read:chatters moderator:read:guest_star user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions user:edit:broadcast user:manage:whispers';

export const twitchRouter = Router();

twitchRouter.get('/success', async (req: Request, res: Response) => {
	res.sendFile('C:/Development/opendevbot/public/success.html');
});

// Define the routes for authentication (auth/twitch)
twitchRouter.get('/', (req: Request, res: Response) => {
	// Redirect the user to the Twitch authorization page with all scopes
	const botAuthUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitchClientId}&redirect_uri=${twitchRedirectUri}&scope=${['chat:edit', 'chat:read', 'channel:moderate', 'bits:read', 'user:edit', 'channel:manage:schedule', 'channel:manage:redemptions', 'channel:read:charity', 'channel:edit:commercial', 'channel:manage:broadcast', 'channel:manage:moderators', 'channel:manage:polls', 'channel:manage:predictions', 'channel:manage:raids', 'channel:read:editors', 'channel:read:goals', 'channel:read:hype_train', 'channel:read:polls', 'channel:read:predictions', 'channel:read:redemptions', 'channel:read:subscriptions', 'channel:read:vips', 'channel:manage:vips', 'clips:edit', 'moderation:read', 'moderator:manage:automod', 'moderator:manage:automod_settings', 'moderator:manage:banned_users', 'moderator:manage:shield_mode', 'moderator:manage:announcements', 'moderator:manage:shoutouts', 'moderator:manage:blocked_terms', 'moderator:manage:chat_messages', 'moderator:manage:chat_settings', 'moderator:manage:guest_star', 'moderator:read:automod_settings', 'moderator:read:blocked_terms', 'moderator:read:shoutouts', 'moderator:read:followers', 'moderator:read:shield_mode', 'moderator:read:chat_settings', 'moderator:read:chatters', 'moderator:read:guest_star', 'user:manage:whispers'].join('%20')}`;
	// const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitchClientId}&redirect_uri=${twitchRedirectUri}&scope=${['bits:read', 'channel:edit:commercial', 'channel:manage:broadcast', 'channel:manage:polls', 'channel:manage:predictions', 'channel:manage:redemptions', 'channel:manage:schedule', 'channel:manage:moderators', 'channel:manage:raids', 'channel:manage:vips', 'channel:read:vips', 'channel:read:polls', 'channel:read:predictions', 'channel:read:redemptions', 'channel:read:editors', 'channel:read:goals', 'channel:read:hype_train', 'channel:read:subscriptions', 'channel_subscriptions', 'clips:edit', 'moderation:read', 'moderator:manage:automod', 'moderator:manage:automod_settings', 'moderator:manage:banned_users', 'moderator:manage:shield_mode', 'moderator:manage:announcements', 'moderator:manage:shoutouts', 'moderator:manage:blocked_terms', 'moderator:manage:chat_messages', 'moderator:manage:chat_settings', 'moderator:manage:guest_star', 'moderator:read:automod_settings', 'moderator:read:blocked_terms', 'moderator:read:shoutouts', 'moderator:read:followers', 'moderator:read:shield_mode', 'moderator:read:chat_settings', 'moderator:read:chatters', 'moderator:read:guest_star', 'user:edit', 'user:edit:follows', 'user:manage:blocked_users', 'user:read:blocked_users', 'user:read:broadcast', 'user:read:email', 'user:read:follows', 'user:read:subscriptions', 'user:edit:broadcast', 'user:manage:whispers'].join('%20')}`;
	res.redirect(botAuthUrl);
});

twitchRouter.get('/callback', async (req: Request, res: Response) => {
	const { code } = req.query;
	try {
		if (typeof code === 'string') {
			// Exchange the authorization code for an access token
			const tokenResponse = await axios.post(
				'https://id.twitch.tv/oauth2/token',
				null,
				{
					params: {
						client_id: twitchClientId,
						client_secret: twitchClientSecret,
						code,
						grant_type: 'authorization_code',
						redirect_uri: twitchRedirectUri,
						scope: botScopes,
					},
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}
			);

			const { access_token, refresh_token, scope, expires_in } = tokenResponse.data;

			// Get the user ID
			const validateResponse: AxiosResponse<validate, any> = await axios.get<validate>('https://id.twitch.tv/oauth2/validate', {
				headers: {
					'Authorization': `Bearer ${access_token}`
				}
			});

			const { user_id, login } = validateResponse.data;

			const existingUser = await TokenModel.findOne<IToken>({ twitchId: user_id });

			if (existingUser) {
				await updateAccessToken(existingUser._id, existingUser.login, access_token, refresh_token, scope, expires_in);
			} else {
				await saveAccessToken(user_id, login, access_token, refresh_token, scope, expires_in);
			}

			// Redirect the user to the success page
			if (res.statusCode === 200) { res.redirect('/auth/twitch/success'); }
		}
	} catch (err) {
		console.error('Error exchanging authorization code for access token:', err);
	}
});

// Save an access token to the database
// Save an access token to the database
const saveAccessToken = async (twitchId: string, login: string, access_token: string, refresh_token: string, scope: string[], expires_in: number) => {
	const obtainmentTimestamp = Date.now(); // Obtain the current timestamp in epoch milliseconds

	const newAccessToken = new TokenModel({
		twitchId,
		login,
		access_token,
		refresh_token,
		scope,
		expires_in,
		obtainmentTimestamp
	});

	try {
		const savedAccessToken = await newAccessToken.save();
		// console.log('Access token saved:', savedAccessToken);
	} catch (error) {
		console.error('Error saving access token:', error);
	}
};

// Update an access token in the database with expiresIn
const updateAccessToken = async (tokenId: string, login: string, accessToken: string, refreshToken: string, scope: string[], expires_in: number) => {
	const obtainmentTimestamp = Date.now(); // Obtain the current timestamp in epoch milliseconds

	try {
		const updatedAccessToken = await TokenModel.findByIdAndUpdate(
			tokenId,
			{ login, accessToken, refreshToken, scope, expires_in, obtainmentTimestamp },
			{ new: true },
		);
		// console.log('Access token updated:', updatedAccessToken);
	} catch (error) {
		console.error('Error updating access token:', error);
	}
};

/**
 * All Scopes:
 * https://dev.twitch.tv/docs/authentication/scopes/
 */


/**
 * User Scopes: bits:read channel:edit:commercial channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:moderators channel:manage:raids channel:manage:vips channel:read:vips channel:read:polls channel:read:predictions channel:read:redemptions channel:read:editors channel:read:goals channel:read:hype_train channel:read:subscriptions channel_subscriptions clips:edit moderation:read moderator:manage:automod moderator:manage:automod_settings moderator:manage:banned_users moderator:manage:shield_mode moderator:manage:announcements moderator:manage:shoutouts moderator:manage:blocked_terms moderator:manage:chat_messages moderator:manage:chat_settings moderator:manage:guest_star moderator:read:automod_settings moderator:read:blocked_terms moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode moderator:read:chat_settings moderator:read:chatters moderator:read:guest_star user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions user:edit:broadcast user:manage:whispers
 */

/**
 * Bot Scopes: chat:edit chat:read channel:moderate bits:read user:edit channel:manage:schedule channel:manage:redemptions channel:read:charity channel:edit:commercial channel:manage:broadcast channel:manage:moderators channel:manage:polls channel:manage:predictions channel:manage:raids channel:read:editors channel:read:goals channel:read:hype_train channel:read:polls channel:read:predictions channel:read:redemptions channel:read:subscriptions channel:read:vips channel:manage:vips clips:edit moderation:read moderator:manage:automod moderator:manage:automod_settings moderator:manage:banned_users moderator:manage:shield_mode moderator:manage:announcements moderator:manage:shoutouts moderator:manage:blocked_terms moderator:manage:chat_messages moderator:manage:chat_settings moderator:manage:guest_star moderator:read:automod_settings moderator:read:blocked_terms moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode moderator:read:chat_settings moderator:read:chatters moderator:read:guest_star user:manage:whispers
*/