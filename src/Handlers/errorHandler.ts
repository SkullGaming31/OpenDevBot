// export default ErrorHandler;
import { config } from 'dotenv';
config({ path: '.env', encoding: 'utf8', quiet: true });
import fs from 'fs';
import path from 'path';
import logger from '../util/logger';

class ErrorHandler {
	private logFile: string;

	/**
	 * @description
	 * Creates a new ErrorHandler.
	 *
	 * The ErrorHandler will log errors to the file path specified by the
	 * PROD_LOG_FILE or DEV_LOG_FILE environment variable, depending on the
	 * value of the Environment environment variable.
	 *
	 * If the log file path is not defined, it will throw an Error.
	 */
	constructor() {
		const logFilePath = process.env.ENVIRONMENT === 'prod' ? process.env.PROD_LOG_FILE as string : process.env.DEV_LOG_FILE as string;

		if (!logFilePath) {
			throw new Error('Log file path is not defined.');
		}

		this.logFile = logFilePath;
	}

	/**
	 * Writes an error to the log file if the log level is 'debug' or 'dev'.
	 *
	 * @param {Error | string} error - The error to be written to the log file.
	 * @param {string} title - The title of the error. This is used to format the log message.
	 *
	 * @private
	 */
	private async writeError(error: Error | string, title: string): Promise<void> {
		const logLevel = process.env.ENVIRONMENT as string;

		if (logLevel === 'debug' || logLevel === 'dev') {
			const description = error instanceof Error ? error.message : error;
			const message = `\n${title}: ${description}`;
			fs.appendFileSync(this.logFile, message);
		}
	}


	/**
	 * @description
	 * Creates the log file if it doesn't exist.
	 *
	 * This function is idempotent. It will do nothing if the log file already exists.
	 *
	 * @throws {Error} If the log file cannot be created.
	 *
	 * @private
	 */
	private async createLogFile(): Promise<void> {
		try {
			const logDir = path.dirname(this.logFile);
			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true });
			}
			if (!fs.existsSync(this.logFile)) {
				fs.writeFileSync(this.logFile, '');
			}
		} catch (err) {
			logger.error(`Error creating log file: ${err}`);
			throw err;
		}
	}

	/**
	 * @description
	 * Listens for unhandled rejection and uncaught exception events and logs them if the log level is 'debug' or 'dev'.
	 *
	 * @private
	 */
	private async listenForEvents(): Promise<void> {
		process.on('unhandledRejection', async (reason: unknown, p: Promise<unknown>) => {
			logger.error(reason, p);
			if (reason instanceof Error) {
				await this.writeError(reason, 'Unhandled Rejection/Catch');
			} else {
				logger.error('Unhandled rejection with unknown reason:', reason);
			}
		});

		process.on('uncaughtException', async (err: Error) => {
			logger.error(err);
			await this.writeError(err, 'Uncaught Exception');
		});
	}

	/**
	 * @description
	 * Initializes the ErrorHandler by creating a log file if it does not exist and setting up event listeners
	 * for unhandledRejection and uncaughtException events.
	 *
	 * @returns {Promise<void>} A promise that resolves when the ErrorHandler is initialized.
	 */
	public async initialize(): Promise<void> {
		await this.createLogFile();
		await this.listenForEvents();
	}
}

export default ErrorHandler;