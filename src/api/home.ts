import { Request, Response, Router } from 'express';

export const homeRouter = Router();

homeRouter.get('/', (req: Request, res: Response) => { 
	// const url = 'https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=4qhq6yv4vbpy6yp4jagdlx7olozrnx&redirect_uri=http://localhost:3001/api/auth/twitch/callback&scope=bits:read+channel:edit:commercial+channel:manage:broadcast+channel:manage:polls+channel:manage:predictions+channel:manage:redemptions+channel:manage:schedule+channel:manage:moderators+channel:manage:raids+channel:manage:vips+channel:read:vips+channel:read:polls+channel:read:predictions+channel:read:redemptions+channel:read:editors+channel:read:goals+channel:read:hype_train+channel:read:subscriptions+channel_subscriptions+clips:edit+moderation:read+moderator:manage:automod+moderator:manage:shield_mode+moderator:manage:shoutouts+moderator:read:shoutouts+moderator:read:followers+moderator:read:shield_mode+user:edit+user:edit:follows+user:manage:blocked_users+user:read:blocked_users+user:read:broadcast+user:read:email+user:read:follows+user:read:subscriptions+user:edit:broadcast+moderator:manage:chat_messages+moderator:manage:banned_users+moderator:read:chatters';
	res.json({ msg: 'This is the home page' });
});