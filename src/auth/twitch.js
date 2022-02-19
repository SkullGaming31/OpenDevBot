const express = require('express');
const axios = require('axios').default;

const config = require('../../config');
const userModel = require('../database/models/user');
const channelModel = require('../database/models/channel');
const twitchAPI = require('../lib/twitch-api');

const redirect_uri = 'http://localhost:5000/auth/twitch/callback';
const twitchRouter = express.Router();


const authBaseUrl = 'https://id.twitch.tv/oauth2';
const twitchAuthApi = axios.create({ 
	baseURL: authBaseUrl 
});



// console.log(redirect_uri);
twitchRouter.get('/', (req, res) => {
	const qs = new URLSearchParams({
		client_id: config.TWITCH_CLIENT_ID,
		redirect_uri,
		response_type: 'code',
		scope: 'bits:read clips:edit user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions moderation:read channel:moderate channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:videos channel:read:editors channel:read:goals channel:read:hype_train channel:read:polls channel:read:predictions channel:read:redemptions channel:read:subscriptions moderator:manage:banned_users moderator:read:blocked_terms moderator:manage:blocked_terms moderator:manage:automod moderator:read:automod_settings moderator:manage:automod_settings moderator:read:chat_settings moderator:manage:chat_settings'
	});
	const redirect_url = `${authBaseUrl}/authorize?${qs}`;
	res.redirect(redirect_url);
});

twitchRouter.get('/callback', async (req, res) => {
	const { code } = req.query;
	const qs = new URLSearchParams({
		client_id: config.TWITCH_CLIENT_ID,
		client_secret: config.TWITCH_CLIENT_SECRET,
		code,
		grant_type: 'authorization_code',
		redirect_uri
	});
	try {
		const { data: { access_token: token, refresh_token } } = await twitchAuthApi.post(`/token?${qs}`);
		const { id: twitchId } = await twitchAPI.getUser({ token });
		const query = { twitchId };
		const options = {
			new: true,
			upsert: true
		};
		const [ user, channel ] = await Promise.all([
			await userModel.findOneAndUpdate(query, { twitchId, refresh_token }, options),
			await channelModel.findOneAndUpdate(query, query, options)
		]);
		res.json({
			user, channel
		});
	} catch (error) { res.json({ 
		message: error.message,
		body: error.response ? error.response.data : error 
	});
	}
});

module.exports = twitchRouter;