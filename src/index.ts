import { config } from 'dotenv';
config();
import { initializeTwitchEventSub } from './EventSubEvents';
import ErrorHandler from './Handlers/errorHandler';
import { initializeChat } from './chat';
import Database from './database';
import createApp from './util/createApp';
// import DiscordBot from './Discord/index';
import fs from 'fs';
import { InjuryModel } from './database/models/injury';
import { SubscriptionModel } from './database/models/eventSubscriptions';

export async function deleteAllInjuries(): Promise<void> {
	try {
		const deleteResult = await InjuryModel.deleteMany({});
		console.log(`Deleted ${deleteResult.deletedCount} entries from the injuries collection.`);
	} catch (error) {
		console.error('Error deleting all injuries:', error);
		throw error;
	}
}

class OpenDevBot {
	startTime: number;

	constructor() {
		this.startTime = Date.now(); // Record the start time
	}

	getUptime(): number { return Date.now() - this.startTime; }
	setTerminalTitle(title: string): void { process.stdout.write(`\x1b]2;${title}\x1b\x5c`); }

	printEnvironmentVariables(): void {
		console.log('Environment Variables from .env file:');
		try {
			const envFilePath = '.env';
			const envFileContents = fs.readFileSync(envFilePath, 'utf8');
			const envVariables = envFileContents.split('\n');

			for (const envVariable of envVariables) {
				const [name, value] = envVariable.split('=');
				console.log(`${name}: ${value}`);
			}
		} catch (error) {
			console.error('Failed to read .env file:', error);
		}
	}
	async start() {
		try {
			const EventSub = process.env.ENABLE_EVENTSUB;
			// Initialize database connection
			const environment = process.env.Enviroment as string;
			let mongoURI = '';

			// Determine MongoDB URI based on environment
			switch (environment) {
				case 'prod':
					mongoURI = process.env.MONGO_URI || '';
					break;
				case 'debug':
				case 'dev':
					mongoURI = process.env.MONGO_URI_DEV || '';
					break;
				default:
					throw new Error(`Unknown environment: ${environment}`);
			}

			// Initialize database connection
			const database = new Database(mongoURI);
			await database.connect();

			// Delete all entries in the injuries collection
			await deleteAllInjuries();

			// Initialize error handling
			const errorHandler = new ErrorHandler();
			await errorHandler.initialize().then(() => console.log('Error Handler initialized')).catch((err: Error) => { console.error('Failed to start Error Handler', err); });


			// Initialize Twitch EventSub event listeners
			if (EventSub) {
				const message = process.env.Enviroment === 'dev' ? 'Event Sub Initialized' : 'Event Sub Started';
				console.time(message);
				await initializeTwitchEventSub();
				console.timeEnd(message);
			}

			// Initialize chat client for Twitch IRC
			if (EventSub) {
				const message = process.env.Enviroment === 'dev' ? 'Chat now Initialized' : 'Chat now Initialized';
				console.time(message);
				await initializeChat();
				console.timeEnd(message);
			}

			// Start the server with app.listen
			const app = createApp();
			app.listen(process.env.PORT || 3001, () => { console.log(`Server listening on http://localhost:${process.env.PORT || 3001}`); });

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
const client = new OpenDevBot();

client.start().then(() => console.log('Bot started successfully')).catch((error) => console.error('Failed to start bot:', error));