import { WebhookClient } from 'discord.js';
import { config } from 'dotenv';
import { generateRandomPirateName } from './util/randomFunctions';

// Import other modules
import { initializeTwitchEventSub } from './EventSubEvents';
import { initializeErrorHandling } from './Handlers/errorHandler';
import { initializeChat } from './chat';
import { initializeDatabase } from './database';
import { createApp } from './util/createApp';

class OpenDevBot {
	webhookClient: WebhookClient;

	constructor() {
		this.webhookClient = new WebhookClient({ url: process.env.DEV_DISCORD_ERROR_WEBHOOK as string });
	}

	async start() {
		try {
			const pirateName = generateRandomPirateName();
			console.log(`We shall begin the fun, ${pirateName.role} ${pirateName.name}`);

			// Initialize Discord webhook client for error handling
			await initializeErrorHandling(this.webhookClient);
			console.log('Error Handler Initialized');

			// Initialize database connection
			await initializeDatabase();

			// Start Express Server (not used for anything right now other than to get an access_token/refresh_token)
			const app = createApp(process.env.PORT || '8001');

			// Initialize Twitch EventSub event listeners
			if (process.env.ENABLE_EVENTSUB) {
				await initializeTwitchEventSub();
			}

			// Initialize chat client for Twitch IRC
			if (process.env.ENABLE_CHAT) { await initializeChat(); }
		} catch (error) {
			console.error(error);
		}
	}
}

config();
const client = new OpenDevBot();
client.start().then(() => {
	console.log('Bot started successfully');
}).catch(error => {
	console.error('Failed to start bot:', error);
});