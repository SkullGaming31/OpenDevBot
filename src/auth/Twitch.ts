import axios from 'axios';
import { Request, Response, Router } from 'express';
// import { AccessTokenModel } from '../database/models/accessToken';
import userModel from '../database/models/user';

// Define the model for access tokens

// Twitch API configuration
const twitchClientId = process.env.TWITCH_CLIENT_ID as string;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET as string;
const twitchRedirectUri = 'http://localhost:3002/auth/twitch/callback';

export const twitchRouter = Router();

// Define the routes for authentication
twitchRouter.get('/twitch', (req: Request, res: Response) => {
	res.send('Testing');
});

twitchRouter.get('/success', async (req: Request, res: Response) => {
	res.send('success you can now close this window');
});

twitchRouter.get('/', (req: Request, res: Response) => {
	// Redirect the user to the Twitch authorization page with all scopes
	// const botAuthUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitchClientId}&redirect_uri=${twitchRedirectUri}&scope=${['channel:moderate', 'bits:read', 'channel:edit:commercial', 'channel:manage:broadcast', 'channel:manage:moderators', 'channel:manage:polls', 'channel:manage:predictions', 'channel:manage:raids', 'channel:read:goals', 'channel:read:hype_train', 'channel:read:polls', 'channel:read:predictions', 'channel:read:redemptions', 'channel:read:subscriptions', 'channel:read:vips', 'channel:manage:vips', 'clips:edit', 'moderation:read', 'moderator:manage:announcements', 'moderator:manage:automod', 'moderator:read:automod_settings', 'moderator:manage:automod_settings', 'moderator:manage:banned_users', 'moderator:read:blocked_terms', 'moderator:manage:blocked_terms', 'moderator:manage:chat_messages', 'moderator:read:chat_settings', 'moderator:manage:chat_settings', 'moderator:read:chatters', 'moderator:read:followers', 'moderator:read:shield_mode', 'moderator:manage:shield_mode', 'moderator:read:shoutouts', 'moderator:manage:shoutouts', 'chat:edit', 'chat:read'].join('%20')}`;
	const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitchClientId}&redirect_uri=${twitchRedirectUri}&scope=${['bits:read','channel:edit:commercial','channel:manage:broadcast','channel:manage:polls','channel:manage:predictions','channel:manage:redemptions','channel:manage:schedule','channel:manage:moderators','channel:manage:raids','channel:manage:vips','channel:read:vips','channel:read:polls','channel:read:predictions','channel:read:redemptions','channel:read:editors','channel:read:goals','channel:read:hype_train','channel:read:subscriptions','channel_subscriptions','clips:edit','moderation:read','moderator:manage:automod','moderator:manage:shield_mode','moderator:manage:shoutouts','moderator:read:shoutouts','moderator:read:followers','moderator:read:shield_mode','user:edit','user:edit:follows','user:manage:blocked_users','user:read:blocked_users','user:read:broadcast','user:read:email','user:read:follows','user:read:subscriptions','user:edit:broadcast','moderator:manage:chat_messages','moderator:manage:banned_users',].join('%20')}`;
	res.redirect(twitchAuthUrl);
});


twitchRouter.get('/callback', async (req: Request, res: Response) => {
	const { code } = req.query;
	try {
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
					scope:
						'bits:read channel:edit:commercial channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:moderators channel:manage:raids channel:manage:vips channel:read:vips channel:read:polls channel:read:predictions channel:read:redemptions channel:read:editors channel:read:goals channel:read:hype_train channel:read:subscriptions channel_subscriptions clips:edit moderation:read moderator:manage:automod moderator:manage:shield_mode moderator:manage:shoutouts moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions user:edit:broadcast moderator:manage:chat_messages moderator:manage:banned_users',
				},
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);
		const validateData = await axios.get('https://id.twitch.tv/oauth2/validate', {// hardcoded for my twitch ID
			headers: {
				'Authorization': `Bearer ${tokenResponse.data.access_token}`
			}
		});
		const { user_id } = validateData.data;
		const userData = await axios.get('https://api.twitch.tv/helix/users', {// hardcoded for my twitch ID
			headers: {
				'Authorization': `Bearer ${tokenResponse.data.access_token}`,
				'Client-ID': twitchClientId
			},
			params: {
				'id': user_id
			}
		});
		const obtainmentTimestamp = new Date();
		const timeStamp = Math.floor(obtainmentTimestamp.getTime() / 1000);
		const { id: twitchId } = userData.data.data[0];
		const { access_token, refresh_token, scope, expires_in } = tokenResponse.data;
		const existingUser = await userModel.findOne({ twitchId: twitchId });// axios gives a data property and twitch gives a data property
		if (existingUser) {
			await updateAccessToken(twitchId, access_token, refresh_token, scope, expires_in, timeStamp);
			// console.log('Updating AccessToken');
		} else {
			await saveAccessToken(twitchId, access_token, refresh_token, scope, expires_in, timeStamp);
			// console.log('Saving AccessToken');
		}

		// Redirect the user to the success page
		res.json({
			'AccessToken': tokenResponse.data.access_token,
			'RefreshToken': tokenResponse.data.refresh_token
		});
		// res.redirect('/auth/twitch/success');
	} catch (err) {
		console.error('Error exchanging authorization code for access token:', err);
		res.send('Error exchanging authorization code for access token:\n' + err);
	}
});

// Save an access token to the database
const saveAccessToken = async (twitchId: string, access_token: string, refresh_token: string, scope: string[], expires_in: number, obtainmentTimestamp: number) => {
	const newAccessToken = new userModel({
		twitchId,
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

// Update an access token in the database with expiresIn and obtainmentTimestamp
const updateAccessToken = async (twitchId: string, accessToken: string, refreshToken: string, scope: string[], expires_in: number, obtainmentTimestamp: number) => {
	try {
		const updatedAccessToken = await userModel.findOneAndUpdate(
			{ twitchId },
			{ accessToken, refreshToken, scope, expires_in, obtainmentTimestamp },
			{ new: true },
		);
		// console.log('Accesstoken updated:', updatedAccessToken);
	} catch (error) {
		console.error('Error updating access token:', error);
	}
};

/**
 * https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=dieihxdt0wezh4kgveyiogn3sjii5p&redirect_uri=http://localhost:3001/auth/twitch&scope=chat:edit%3Achat:read%3Achannel:moderate%3Achannel:moderate%3Achannel_commercial%3Achannel_editor
 * https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=hof5gwx0su6owfnys0nyan9c87zr6t&redirect_uri=http://localhost:3001/auth/twitch&scope=chat:edit%3Achat:read%3Achannel:moderate%3Achannel:moderate%3Achannel_commercial%3Achannel_editor
 * Bot Auth Scopes 
 * 
 * chat:edit chat:read channel:moderate channel:moderate channel_commercial channel_editor
 */