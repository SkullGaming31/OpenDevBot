import { config } from 'dotenv';
config();
import { initMonitoring } from './monitoring';
import { initializeTwitchEventSub } from './EventSubEvents';
import { startRetryWorker } from './EventSub/retryWorker';
import ErrorHandler from './Handlers/errorHandler';
import { initializeChat } from './chat';
import Database from './database';
import createApp from './util/createApp';
import { initializeConstants } from './util/constants';
import fs from 'fs';
import { InjuryModel } from './database/models/injury';
import { deleteAllInjuries, deleteExpiredInjuries } from './services/injuryCleanup';
import ENVIRONMENT from './util/env';

/**
 * Deletes all documents from the injuries collection.
 *
 * @returns {Promise<void>}
 */

class OpenDevBot {
	startTime: number;

	/**
	 * Initializes the start time of the OpenDevBot instance.
	 */
	constructor() {
		this.startTime = Date.now(); // Record the start time
	}

	getUptime(): number { return Date.now() - this.startTime; }
	setTerminalTitle(title: string): void { process.stdout.write(`\x1b]2;${title}\x1b\x5c`); }

	/**
	 * Prints all environment variables from the .env file to the console.
	 * The variables are printed in the format 'VARIABLE_NAME: variable_value'.
	 * If the .env file cannot be read (for example, if it does not exist), the error is logged to the console.
	 */
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
	/**
	 * Starts the OpenDevBot by initializing necessary components and services.
	 * 
	 * This function performs the following tasks:
	 * - Determines the MongoDB URI based on the environment and initializes the database connection.
	 * - Copies metadata files from the source to the destination directory if they exist.
	 * - Deletes all entries in the injuries collection from the database.
	 * - Initializes error handling with the ErrorHandler.
	 * - Optionally initializes Twitch EventSub event listeners if enabled in the environment variables.
	 * - Optionally initializes the chat client for Twitch IRC if enabled in the environment variables.
	 * - Starts the server on the specified port and sets the terminal title.
	 * 
	 * Environment variables:
	 * - ENABLE_EVENTSUB: Determines if Twitch EventSub should be initialized.
	 * - ENABLE_CHAT: Determines if the chat client for Twitch IRC should be initialized.
	 * - Enviroment: Specifies the environment type (e.g., 'prod', 'dev', 'debug').
	 * - MONGO_URI/DOCKER_URI: MongoDB connection URIs for different environments.
	 * - PORT: Port number on which the server should listen.
	 * 
	 * @throws {Error} Throws an error if an unknown environment is specified or if any initialization step fails.
	 */
	async start() {
		try {
			const EventSub = process.env.ENABLE_EVENTSUB;
			const chatIIRC = process.env.ENABLE_CHAT;
			// Initialize database connection
			const environment = ENVIRONMENT as string;
			let mongoURI = '';

			// Determine MongoDB URI based on environment
			switch (environment) {
				case 'prod':
					mongoURI = process.env.MONGO_URI || '';
					break;
				case 'debug':
				case 'dev':
					mongoURI = process.env.DOCKER_URI || '';
					break;
				default:
					throw new Error(`Unknown environment: ${environment}`);
			}

			// Initialize database connection
			const database = new Database(mongoURI);
			await database.connect();

			// Injury cleanup strategy:
			// - If RESET_INJURIES=true, delete all injuries (legacy behavior)
			// - Otherwise remove only expired injury entries (safer)
			if (process.env.RESET_INJURIES === 'true') {
				console.warn('RESET_INJURIES=true: removing all entries from injuries collection (legacy behavior)');
				await deleteAllInjuries();
			} else {
				await deleteExpiredInjuries();
				// Schedule periodic cleanup (default once per day). Interval ms can be configured with INJURY_CLEANUP_INTERVAL_MS.
				const cleanupInterval = process.env.INJURY_CLEANUP_INTERVAL_MS ? Number(process.env.INJURY_CLEANUP_INTERVAL_MS) : 24 * 60 * 60 * 1000;
				// Do not start background interval during tests to avoid open handles that prevent Jest from exiting.
				if (process.env.NODE_ENV !== 'test' && cleanupInterval > 0) {
					setInterval(() => { void deleteExpiredInjuries(); }, cleanupInterval);
				}
			}

			// Initialize error handling
			const errorHandler = new ErrorHandler();
			await errorHandler.initialize().then(() => console.log('Error Handler initialized')).catch((err: Error) => { console.error('Failed to start Error Handler', err); });


			// Initialize Twitch EventSub event listeners
			if (EventSub) {
				// During tests we avoid initializing EventSub and constants because tests
				// typically mock the Database and do not establish a real mongoose
				// connection; calling initializeConstants() would hit TokenModel.find()
				// and cause buffering/timeouts. Only initialize in non-test runs.
				if (process.env.NODE_ENV === 'test') {
					console.log('Skipping EventSub initialization in test environment');
				} else {
					const message = ENVIRONMENT === 'dev' ? 'Event Sub Initialized' : 'Event Sub Started';
					console.time(message);
					// Ensure constants (broadcasterInfo, moderatorIDs) are initialized from DB
					await initializeConstants();
					await initializeTwitchEventSub();
					// start background retry worker to process failed subscription creations
					void startRetryWorker();
					console.timeEnd(message);
				}
			}

			// Initialize chat client for Twitch IRC
			if (chatIIRC) {
				if (process.env.NODE_ENV === 'test') {
					console.log('Skipping Chat initialization in test environment');
				} else {
					const message = ENVIRONMENT === 'dev' ? 'Chat now Initialized' : 'Chat now Initialized';
					console.time(message);
					// Ensure broadcaster info is loaded for chat operations
					await initializeConstants();
					await initializeChat();
					console.timeEnd(message);
				}
			}

			// Start the server with app.listen
			const app = createApp();
			app.listen(process.env.PORT || 3000, () => { console.log(`Server listening on http://localhost:${process.env.PORT || 3001}`); });

			// Set initial terminal title based on the terminal type
			const terminalTitle = process.platform === 'win32' ? 'OpenDevBot[Twitch]' : 'Uptime: ';
			process.stdout.write(`\x1b]2;${terminalTitle}\x1b\x5c`);

		} catch (error) {
			console.error('Error during bot startup:', error);
			throw error;
		}
	}
	/**
	 * Get the uptime of the bot in a human-readable format.
	 *
	 * The returned string will be in the format "X days Y hours Z minutes W seconds", where X, Y, Z, and W are the number
	 * of days, hours, minutes, and seconds that the bot has been running, respectively.
	 * @return {string} The uptime of the bot in a human-readable format.
	 */
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

// Initialize monitoring (Sentry/LogDNA) if configured
initMonitoring();

client.start().then(() => console.log('Bot started successfully')).catch((error) => console.error('Failed to start bot:', error));