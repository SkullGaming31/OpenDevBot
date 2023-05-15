import { WebhookClient } from 'discord.js';
import { config } from 'dotenv';
config();

import { EventSubEvents } from './EventSubEvents';
import { errorHandler } from './Handlers/errorHandler';
import { getChatClient, initializeChat } from './chat';
import { init } from './database';
import { createApp } from './util/createApp';
// import healthListener from './api/health';

async function start() {
	const webhookClient = new WebhookClient({ url: process.env.DEV_DISCORD_ERROR_WEBHOOK as string });
	const chatClient = await getChatClient();
	try {
		// Initialize Discord webhook client for error handling
		await errorHandler(webhookClient).then(() => { console.log('Error Handler Initialized'); });
	
		// Initialize database connection
		await init();

		// Start Express Server, not used for anything right now other then to get a access_token/refresh_token
		const app = createApp(process.env.PORT || '3002');// use the port in the env or default to 3002 if the port is not defined in the env
	

		// Initialize Twitch EventSub event listeners
		await EventSubEvents();

		// Initialize chat client for Twitch IRC
		await initializeChat();
	} catch (error) {
		console.error(error);
	}

}
start();