import { config } from 'dotenv';
config();
import { Request, Response } from 'express';

import { EventSubEvents } from './EventSubEvents';
import { init } from './database';
import { errorHandler } from './Handlers/errorHandler';
import { createApp } from './util/createApp';
import healthListener from './api/health';
import { initializeChat } from './chat';

async function start() {

	await errorHandler().then(() => { console.log('Error Handler Initialized'); });
	await EventSubEvents();
	await initializeChat();
	await init();

	
	const app = createApp();

	app.get('/', (req: Request, res: Response) => {
		res.sendFile('index.html');
	});
	
	app.get('/health', healthListener);
	
}
start();