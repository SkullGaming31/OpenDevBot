import { WebhookClient } from 'discord.js';
import { config } from 'dotenv';
config();

import { EventSubEvents } from './EventSubEvents';
import { errorHandler } from './Handlers/errorHandler';
import { initializeChat } from './chat';
import { init } from './database';
import { createApp } from './util/createApp';
// import healthListener from './api/health';

async function start() {
	const webhookClient = new WebhookClient({ url: process.env.DEV_DISCORD_ERROR_WEBHOOK as string });

	await errorHandler(webhookClient).then(() => { console.log('Error Handler Initialized'); });
	await EventSubEvents();
	await initializeChat();
	await init();
	// await createChannelPointsRewards();

	
	const app = createApp();
}
start();