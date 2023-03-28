// import { Request, Response, Router } from 'express';
// import axios from 'axios';
// axios.defaults;

// import userModel from '../database/models/user';
// import channelModel from '../database/models/channel';
// import { getUser } from '../lib/twitch-api';

// const redirect_uri = 'localhost:3001/api/auth/twitch/callback';
// const twitchRouter = Router();


// const authBaseUrl = 'https://id.twitch.tv/oauth2';
// const twitchAuthApi = axios.create({
// 	baseURL: authBaseUrl,
// 	headers: {
// 		'Content-Type': 'x-www-form-urlencoded'
// 	}
// });

// // console.log(redirect_uri);
// twitchRouter.get('/', (req, res) => {
// 	/* const BOTqs = new URLSearchParams({
// 		client_id: config.TWITCH_CLIENT_ID,
// 		redirect_uri,
// 		response_type: 'code',
// 		scope: 'chat:edit chat:read moderator:manage:banned_users moderator:read:blocked_terms moderator:manage:blocked_terms moderator:manage:automod moderator:read:automod_settings moderator:manage:automod_settings moderator:read:chat_settings moderator:manage:chat_settings channel:moderate'
// 	}); */
// 	const qs = new URLSearchParams({
// 		client_id: process.env.TWITCH_CLIENT_ID,
// 		redirect_uri,
// 		response_type: 'code',
// 		scope: 'chat:edit chat:read bits:read clips:edit user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions moderation:read channel:moderate channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:videos channel:read:editors channel:read:goals channel:read:hype_train channel:read:polls channel:read:predictions channel:read:redemptions channel:read:subscriptions moderator:manage:banned_users moderator:read:blocked_terms moderator:manage:blocked_terms moderator:manage:automod moderator:read:automod_settings moderator:manage:automod_settings moderator:read:chat_settings moderator:manage:chat_settings user:edit:broadcast'
// 	});
// 	const redirect_url = `${authBaseUrl}/authorize?${qs}`;
// 	res.redirect(redirect_url);
// });

// twitchRouter.get('/callback', async (req: Request, res: Response) => {
// 	const { code } = req.query;
// 	const qs = new URLSearchParams({
// 		client_id: `${process.env.TWITCH_CLIENT_ID}`,
// 		client_secret: `${process.env.TWITCH_CLIENT_SECRET}`,
// 		code,
// 		grant_type: 'authorization_code',
// 		redirect_uri
// 	});
// 	try {
// 		const { data: { access_token: token, refresh_token } } = await twitchAuthApi.post(`/token?${qs}`);
// 		const { id: twitchId, login: name } = await getUser({ token });
// 		// console.log('UserToken: ' + token);
// 		const options = {
// 			new: true,
// 			upsert: true
// 		};
// 		const [user, channel] = await Promise.all([
// 			await userModel.findOneAndUpdate({ twitchId }, { twitchId, token, refresh_token }, options),
// 			await channelModel.findOneAndUpdate({ twitchId }, { twitchId, name }, options)
// 		]);
// 		res.json({ user, channel });
// 	} catch (error: any) {
// 		res.json({
// 			message: error.message,
// 			body: error.response ? error.response.data : error
// 		});
// 	}
// });

// export default twitchRouter;