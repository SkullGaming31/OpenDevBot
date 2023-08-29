import axios, { AxiosResponse } from 'axios';
import { config } from 'dotenv';
import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { IToken, TokenModel } from '../database/models/tokenModel';
config();

interface validate {
	client_id: string,
	login: string,
	scopes: string[],
	user_id: string,
	expires_in: number
}

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
});

export const apiRouter = Router();
// Twitch API configuration
const twitchClientId = process.env.TWITCH_CLIENT_ID as string;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET as string;
// const discordClientID = process.env.DEV_DISCORD_CLIENT_ID as string;
// const discordClientSecret = process.env.DEV_DISCORD_CLIENT_SECRET as string;
const twitchRedirectUri = 'http://localhost:8000/api/auth/twitch/callback';
const botScopes = 'chat:edit chat:read channel:moderate bits:read user:edit channel:manage:schedule channel:manage:redemptions channel:read:charity channel:edit:commercial channel:manage:broadcast channel:manage:moderators channel:manage:polls channel:manage:predictions channel:manage:raids channel:read:editors channel:read:goals channel:read:hype_train channel:read:polls channel:read:predictions channel:read:redemptions channel:read:subscriptions channel:read:vips channel:manage:vips clips:edit moderation:read moderator:manage:automod moderator:manage:automod_settings moderator:manage:banned_users moderator:manage:shield_mode moderator:manage:announcements moderator:manage:shoutouts moderator:manage:blocked_terms moderator:manage:chat_messages moderator:manage:chat_settings moderator:manage:guest_star moderator:read:automod_settings moderator:read:blocked_terms moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode moderator:read:chat_settings moderator:read:chatters moderator:read:guest_star user:manage:whispers user:read:subscriptions';
const userScopes = 'bits:read channel:edit:commercial channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:moderators channel:manage:raids channel:manage:vips channel:read:vips channel:read:polls channel:read:predictions channel:read:redemptions channel:read:editors channel:read:goals channel:read:hype_train channel:read:subscriptions channel_subscriptions clips:edit moderation:read moderator:manage:automod moderator:manage:automod_settings moderator:manage:banned_users moderator:manage:shield_mode moderator:manage:announcements moderator:manage:shoutouts moderator:manage:blocked_terms moderator:manage:chat_messages moderator:manage:chat_settings moderator:manage:guest_star moderator:read:automod_settings moderator:read:blocked_terms moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode moderator:read:chat_settings moderator:read:chatters moderator:read:guest_star user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions user:edit:broadcast user:manage:whispers';

apiRouter.get('/', limiter, (req: Request, res: Response) => {
	res.json({
		msg: 'Start of the API Router'
	});
});

apiRouter.get('/twitch', limiter, (req: Request, res: Response) => { // Twitch Auth Landing
	// Redirect the user to the Twitch authorization page with all scopes
	const userAuthUrl = generateAuthUrl(['bits:read', 'channel:edit:commercial', 'channel:manage:broadcast', 'channel:manage:polls', 'channel:manage:predictions', 'channel:manage:redemptions', 'channel:manage:schedule', 'channel:manage:moderators', 'channel:manage:raids', 'channel:manage:vips', 'channel:read:vips', 'channel:read:polls', 'channel:read:predictions', 'channel:read:redemptions', 'channel:read:editors', 'channel:read:goals', 'channel:read:hype_train', 'channel:read:subscriptions', 'channel_subscriptions', 'clips:edit', 'moderation:read', 'moderator:manage:automod', 'moderator:manage:automod_settings', 'moderator:manage:banned_users', 'moderator:manage:shield_mode', 'moderator:manage:announcements', 'moderator:manage:shoutouts', 'moderator:manage:blocked_terms', 'moderator:manage:chat_messages', 'moderator:manage:chat_settings', 'moderator:manage:guest_star', 'moderator:read:automod_settings', 'moderator:read:blocked_terms', 'moderator:read:shoutouts', 'moderator:read:followers', 'moderator:read:shield_mode', 'moderator:read:chat_settings', 'moderator:read:chatters', 'moderator:read:guest_star', 'user:edit', 'user:edit:follows', 'user:manage:blocked_users', 'user:read:blocked_users', 'user:read:broadcast', 'user:read:email', 'user:read:follows', 'user:read:subscriptions', 'user:edit:broadcast', 'user:manage:whispers']);
	const botAuthUrl = generateAuthUrl(['chat:edit', 'chat:read', 'channel:moderate', 'bits:read', 'user:edit', 'channel:manage:schedule', 'channel:manage:redemptions', 'channel:read:charity', 'channel:edit:commercial', 'channel:manage:broadcast', 'channel:manage:moderators', 'channel:manage:polls', 'channel:manage:predictions', 'channel:manage:raids', 'channel:read:editors', 'channel:read:goals', 'channel:read:hype_train', 'channel:read:polls', 'channel:read:predictions', 'channel:read:redemptions', 'channel:read:subscriptions', 'channel:read:vips', 'channel:manage:vips', 'clips:edit', 'moderation:read', 'moderator:manage:automod', 'moderator:manage:automod_settings', 'moderator:manage:banned_users', 'moderator:manage:shield_mode', 'moderator:manage:announcements', 'moderator:manage:shoutouts', 'moderator:manage:blocked_terms', 'moderator:manage:chat_messages', 'moderator:manage:chat_settings', 'moderator:manage:guest_star', 'moderator:read:automod_settings', 'moderator:read:blocked_terms', 'moderator:read:shoutouts', 'moderator:read:followers', 'moderator:read:shield_mode', 'moderator:read:chat_settings', 'moderator:read:chatters', 'moderator:read:guest_star', 'user:manage:whispers', 'user:read:subscriptions']);
	res.redirect(userAuthUrl);
});
// apiRouter.get('/discord', limiter, (req: Request, res: Response) => { // Discord Auth Landing
// Redirect the user to the Discord authorization page with all scopes
// 	res.json({ msg: 'Coming Soon' });
// 	res.redirect('https://discord.com/api/oauth2/authorize?client_id=930882181595807774&permissions=30092622032118&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fauth%2Fdiscord%2Fredirect&response_type=code&scope=identify%20guilds%20applications.commands%20bot%20connections');
// });
// apiRouter.get('/auth/discord/redirect', async (req: Request, res: Response) => {
// 	const { code } = req.query;

// 	if (code) {
// 		try {
// 			const tokenResponse = await axios.post(
// 				'https://discord.com/api/oauth2/token',
// 				new URLSearchParams({
// 					client_id: discordClientID,
// 					client_secret: discordClientSecret,
// 					code: code as string,
// 					grant_type: 'authorization_code',
// 					redirect_uri: 'http://localhost:8000/api/auth/discord/redirect',
// 					scope: 'identify applications.commands bot connections guilds ',
// 				}).toString(),
// 				{
// 					headers: {
// 						'Content-Type': 'application/x-www-form-urlencoded',
// 					},
// 				}
// 			);

// 			const oauthData = tokenResponse.data;
// 			console.log(oauthData);

// Connect to MongoDB using Mongoose
// const mongoURI = process.env.MONGO_URI_DRAGONBOT as string; // Replace with your MongoDB URI and database name
// mongoose.connect(mongoURI);

// Create a new token document and save it to the database
// const newToken = new TokenModel({ oauthData });
// await newToken.save();

// console.log('Token details inserted into MongoDB using Mongoose');
// } catch (error: any) {
// Handle unauthorized token
// if (error.response && error.response.status === 401) {
// 	console.error('Unauthorized token:', error.response.data);
// 	return res.status(401).send('Unauthorized token');
// }

// Handle other errors
// 			console.error('Error exchanging token:', error);
// 			return res.status(500).send('Error exchanging token');
// 		}
// 	}
// 	res.redirect('/');
// });

apiRouter.get('/auth/twitch/callback', limiter, async (req: Request, res: Response) => {
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
						scope: userScopes,
					},
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}
			);

			const { access_token, refresh_token, scope, expires_in } = tokenResponse.data;

			// console.log('Access Token:', access_token);
			// console.log('Refresh Token:', refresh_token);
			// console.log('Scope:', scope);
			// console.log('Expires In:', expires_in);

			// Get the user ID
			const validateResponse: AxiosResponse<validate, any> = await axios.get<validate>('https://id.twitch.tv/oauth2/validate', {
				headers: {
					'Authorization': `Bearer ${access_token}`
				}
			});

			const { user_id: twitchId, login, scopes } = validateResponse.data;

			const existingUser = await TokenModel.findOne<IToken>({ twitchId: twitchId });

			if (existingUser) {
				await updateAccessToken(existingUser.twitchId, existingUser.login, access_token, refresh_token, scope, expires_in);
			} else {
				await saveAccessToken(twitchId, login, access_token, refresh_token, scope, expires_in);
			}

			// Redirect the user to the success page
			if (res.statusCode === 200) { res.redirect('/auth/twitch/success'); }
		}
	} catch (err) { console.error('Error exchanging authorization code for access token:', err); }
});

apiRouter.get('/vigor', limiter, (req: Request, res: Response) => {
	res.json({ Endpoint: 'endpoint test', Url: req.originalUrl });
});

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
		console.log('Access token saved:', savedAccessToken);
	} catch (error) {
		console.error('Error saving access token:', error);
	}
};

// Update an access token in the database with expiresIn
const updateAccessToken = async (tokenId: string, login: string, accessToken: string, refreshToken: string, scope: string[], expires_in: number) => {
	const obtainmentTimestamp = Date.now(); // Obtain the current timestamp in epoch milliseconds

	try {
		const updatedAccessToken = await TokenModel.findOneAndUpdate<IToken>(
			{ twitchId: tokenId },
			{ login, accessToken, refreshToken, scope, expires_in, obtainmentTimestamp },
			{ new: true },
		);
		console.log('Access token updated:', updatedAccessToken);
	} catch (error) {
		console.error('Error updating access token:', error);
	}
};

function generateAuthUrl(scopes: string[]): string {
	const joinedScopes = scopes.join('%20');
	return `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitchClientId}&redirect_uri=${twitchRedirectUri}&scope=${joinedScopes}`;
}