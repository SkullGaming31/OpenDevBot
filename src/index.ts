import { WebhookClient } from 'discord.js';
import { config } from 'dotenv';
import { initializeTwitchEventSub } from './EventSubEvents';
import { initializeErrorHandling } from './Handlers/errorHandler';
import { initializeChat } from './chat';
import { initializeDatabase } from './database';

class OpenDevBot {
	webhookClient: WebhookClient;
	startTime: number;

	constructor(webhookUrl: string) {
		this.webhookClient = new WebhookClient({ url: webhookUrl });
		this.startTime = Date.now(); // Record the start time
	}

	getUptime(): number {
		return Date.now() - this.startTime;
	}
	setTerminalTitle(title: string): void {
		process.stdout.write(`\x1b]2;${title}\x1b\x5c`);
	}

	async start() {
		try {
			// Initialize database connection
			await initializeDatabase();

			// Initialize error handling
			await initializeErrorHandling(this.webhookClient);

			// Initialize Twitch EventSub event listeners
			if (process.env.ENABLE_EVENTSUB) {
				const message = process.env.Enviroment === 'dev' ? 'Event Sub Initialized' : 'Event Sub Started';
				console.time(message);
				await initializeTwitchEventSub();
				console.timeEnd(message);
			}

			// Initialize chat client for Twitch IRC
			if (process.env.ENABLE_CHAT) {
				const message = process.env.Enviroment === 'dev' ? 'Chat now Initialized' : 'Chat now Initialized';
				console.time(message);
				await initializeChat();
				console.timeEnd(message);
			}

			// Set initial terminal title based on the terminal type
			const terminalTitle = process.platform === 'win32' ? 'OpenDevBot[Twitch]' : 'Uptime: ';
			process.stdout.write(`\x1b]2;${terminalTitle}\x1b\x5c`);

		} catch (error) {
			console.error('Error during bot startup:', error);
			throw error;
		}
	}
	getFormattedUptime(): string {
		const uptimeMilliseconds = this.getUptime();
		const uptimeSeconds = Math.floor(uptimeMilliseconds / 1000);
		const days = Math.floor(uptimeSeconds / (3600 * 24));
		const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
		const minutes = Math.floor((uptimeSeconds % 3600) / 60);
		const seconds = uptimeSeconds % 60;

		const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
		return formattedUptime;
	}
}

config();
const webhookUrl = process.env.DEV_DISCORD_ERROR_WEBHOOK as string;
const client = new OpenDevBot(webhookUrl);

console.log('Start Called: ', client.start.length + 1 + ' times');
client.start()
	.then(() => console.log('Bot started successfully'))
	.catch(error => console.error('Failed to start bot:', error));