import { config } from 'dotenv';
config();
import { Request, Response } from 'express';
import { WebhookClient } from 'discord.js';

import { EventSubEvents } from './EventSubEvents';
import { init } from './database';
import { errorHandler } from './Handlers/errorHandler';
import { createApp } from './util/createApp';
// import healthListener from './api/health';
import { initializeChat } from './chat';

async function start() {
	const webhookClient = new WebhookClient({ url: process.env.DEV_DISCORD_ERROR_WEBHOOK as string });

	await errorHandler(webhookClient).then(() => { console.log('Error Handler Initialized'); });
	await EventSubEvents();
	await initializeChat();
	await init();

	
	const app = createApp();
}
start();