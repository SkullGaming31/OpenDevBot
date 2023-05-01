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
	
	// Initialize Discord webhook client for error handling
	await errorHandler(webhookClient).then(() => { console.log('Error Handler Initialized'); });

	// Initialize Twitch EventSub event listeners
	await EventSubEvents();

	// Initialize chat client for Twitch IRC
	await initializeChat();

	// Initialize database connection
	await init();

	// Start Express Server
	const app = createApp(process.env.PORT || '3002');// use the port in the env or default to 3002 if the port is not defined in the env
}
start();