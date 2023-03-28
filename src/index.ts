import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Client, GatewayIntentBits }  from'discord.js';

import { twitchChat } from './twitchChat';
import { init } from './database';
import { errorHandler } from './Structure/errorHandler';

export const client = new Client({ intents: [GatewayIntentBits.GuildWebhooks, GatewayIntentBits.GuildMembers] });
const port = process.env.PORT;

async function run() {
	const app = express();

	app.use(cors());
	app.use(helmet());
	app.use(morgan('tiny'));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());

	app.get('/', (req: Request, res: Response, next: NextFunction) => {
		res.sendFile('src/assets/index.html', { root: '.' });
		next();
	});
	app.get('/about', (req: Request, res: Response, next: NextFunction) => {
		res.sendFile('src/assets/about.html', { root: '.' });
		next();
	});

	// app.use('/auth/twitch', require('./auth/twitch'));// not currently working, issue with QueryParam

	app.listen(port || 3002, () => { console.log(`Server started on http://localhost:${port}`); });
	// await init();
}
errorHandler();
run();
twitchChat();

/*
BOT- https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=dieihxdt0wezh4kgveyiogn3sjii5p&redirect_uri=http://localhost:3001/api/auth/twitch/callback&scope=chat%3Aedit%20chat%3Aread%20moderation%3Aread
USER- https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=dieihxdt0wezh4kgveyiogn3sjii5p&redirect_uri=http://localhost:3001/api/auth/twitch/callback&scope=bits%3Aread%20channel%3Aedit%3Acommercial%20channel%3Amanage%3Abroadcast%20channel%3Amanage%3Apolls%20channel%3Amanage%3Apredictions%20channel%3Amanage%3Aredemptions%20channel%3Amanage%3Aschedule%20channel%3Amanage%3Amoderators%20channel%3Amanage%3Araids%20channel%3Amanage%3Avips%20channel%3Aread%3Avips%20channel%3Aread%3Apolls%20channel%3Aread%3Apredictions%20channel%3Aread%3Aredemptions%20channel%3Aread%3Aeditors%20channel%3Aread%3Agoals%20channel%3Aread%3Ahype_train%20channel%3Aread%3Asubscriptions%20channel_subscriptions%20clips%3Aedit%20moderation%3Aread%20moderator%3Amanage%3Aautomod%20moderator%3Amanage%3Ashield_mode%20moderator%3Amanage%3Ashoutouts%20moderator%3Aread%3Ashoutouts%20moderator%3Aread%3Afollowers%20moderator%3Aread%3Ashield_mode%20user%3Aedit%20user%3Aedit%3Afollows%20user%3Amanage%3Ablocked_users%20user%3Aread%3Ablocked_users%20user%3Aread%3Abroadcast%20user%3Aread%3Aemail%20user%3Aread%3Afollows%20user%3Aread%3Asubscriptions%20user%3Aedit%3Abroadcast
*/

// bot scopes- chat:edit chat:read moderation:read

/*
USER SCOPES-
bits:read channel:edit:commercial channel:manage:broadcast channel:manage:polls channel:manage:predictions channel:manage:redemptions channel:manage:schedule channel:manage:moderators channel:manage:raids channel:manage:vips channel:read:vips channel:read:polls channel:read:predictions channel:read:redemptions channel:read:editors channel:read:goals channel:read:hype_train channel:read:subscriptions channel_subscriptions clips:edit moderation:read moderator:manage:automod moderator:manage:shield_mode moderator:manage:shoutouts moderator:read:shoutouts moderator:read:followers moderator:read:shield_mode user:edit user:edit:follows user:manage:blocked_users user:read:blocked_users user:read:broadcast user:read:email user:read:follows user:read:subscriptions user:edit:broadcast
*/