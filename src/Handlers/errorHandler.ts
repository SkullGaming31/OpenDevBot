// import { config } from 'dotenv';
// config();
// import fs from 'fs';

// class ErrorHandler {
// 	private logFile: string;

// 	/**
// 	 * Creates a new instance of the ErrorHandler class.
// 	 *
// 	 * @throws {Error} - If the log file path is not defined.
// 	 */
// 	constructor() {
// 		const logFilePath = process.env.Enviroment === 'prod' ? process.env.PROD_LOG_FILE as string : process.env.DEV_LOG_FILE as string;

// 		if (!logFilePath) {
// 			throw new Error('Log file path is not defined.');
// 		}

// 		this.logFile = logFilePath;
// 	}

// 	/**
// 	 * Writes an error to the log file.
// 	 *
// 	 * @param {Error | string} error - The error to be written to the log file.
// 	 * @param {string} title - The title of the error. This is used to format the log message.
// 	 *
// 	 * @private
// 	 */
// 	private async writeError(error: Error | string, title: string) {
// 		const logLevel = process.env.Enviroment; // Get the environment variable

// 		// Check if the log level is 'debug' or 'dev'
// 		if (logLevel === 'debug' || logLevel === 'dev') {
// 			const description = typeof error === 'string' ? error : error.message;
// 			const message = `\n${title}: ${description}`;
// 			fs.appendFileSync(this.logFile, message);
// 		}
// 	}

// 	/**
// 	 * Initializes the ErrorHandler by creating a new log file if it does not exist.
// 	 * Also listens for unhandledRejection and uncaughtException events and logs them.
// 	 *
// 	 * @returns {Promise<void>} A promise that resolves when the ErrorHandler is initialized.
// 	 */
// 	public async initialize() {
// 		if (!fs.existsSync(this.logFile)) {
// 			try {
// 				fs.writeFileSync(this.logFile, '');
// 			} catch (err) {
// 				console.error(`Error creating log file: ${err}`);
// 				return;
// 			}
// 		}

// 		process.on('unhandledRejection', async (reason: unknown, p: Promise<unknown>) => {
// 			console.error(reason, p);
// 			if (typeof reason === 'string' || reason instanceof Error) {
// 				await this.writeError(reason, 'Unhandled Rejection/Catch');
// 			} else {
// 				console.error('Unhandled rejection with unknown reason:', reason);
// 			}
// 		});

// 		process.on('uncaughtException', async (err: Error) => {
// 			console.error(err);
// 			await this.writeError(err, 'Uncaught Exception');
// 		});
// 	}
// }

// export default ErrorHandler;
import { config } from 'dotenv';
config();
import fs from 'fs';
import path from 'path';

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
		const logFilePath = process.env.Environment === 'prod' ? process.env.PROD_LOG_FILE as string : process.env.DEV_LOG_FILE as string;

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
		const logLevel = process.env.Environment;

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
			console.error(`Error creating log file: ${err}`);
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
			console.error(reason, p);
			if (reason instanceof Error) {
				await this.writeError(reason, 'Unhandled Rejection/Catch');
			} else {
				console.error('Unhandled rejection with unknown reason:', reason);
			}
		});

		process.on('uncaughtException', async (err: Error) => {
			console.error(err);
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