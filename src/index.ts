import { WebhookClient } from 'discord.js';
import { config } from 'dotenv';
import { generateRandomPirateName } from './util/randomFunctions';

import { initializeTwitchEventSub } from './EventSubEvents';
import { initializeErrorHandling } from './Handlers/errorHandler';
import { initializeChat } from './chat';
import { initializeDatabase } from './database';

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

			// Initialize Twitch EventSub event listeners
			if (process.env.ENABLE_EVENTSUB) {
				if (process.env.Enviroment === 'dev') {
					console.time('Event Sub Initialized');
					await initializeTwitchEventSub();
					console.timeEnd('Event Sub Initialized');
				} else {
					await initializeTwitchEventSub();
					console.info('Event Sub Started');
				}
			}

			// Initialize chat client for Twitch IRC
			if (process.env.ENABLE_CHAT) {
				if (process.env.Enviroment === 'dev') {
					console.time('Chat now Initialized');
					await initializeChat();
					console.timeEnd('Chat now Initialized');
				} else {
					await initializeChat();
					console.info('Chat now Initialized');
				}
			}
		} catch (error) {
			console.error(error);
		}
	}
}

config();
const client = new OpenDevBot();
client.start().then(() => { console.log('Bot started successfully'); }).catch(error => { console.error('Failed to start bot:', error); });