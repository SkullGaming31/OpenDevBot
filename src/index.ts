import { config } from 'dotenv';
config();
import { Request, Response } from 'express';

import { twitchChat } from './twitchChat';
import { init } from './database';
import { errorHandler } from './Handlers/errorHandler';
import { createApp } from './util/createApp';
import healthListener from './api/health';

async function run() {

	await errorHandler().then(() => { console.log('Error Handler Initialized'); });
	await twitchChat();
	await init();
	const app = createApp();

	app.get('/', (req: Request, res: Response) => {
		res.sendFile('index.html');
	});
	
	app.get('/health', healthListener);
	
}
run();