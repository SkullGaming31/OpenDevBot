import { config } from 'dotenv';
config();
import fs from 'fs';


class ErrorHandler {
	private logFile: string;

	constructor() {
		const logFilePath = process.env.Enviroment === 'prod' ? process.env.PROD_LOG_FILE as string : process.env.DEV_LOG_FILE as string;

		if (!logFilePath) {
			throw new Error('Log file path is not defined.');
		}

		this.logFile = logFilePath;
	}

	private async writeError(error: Error | string, title: string) {
		const description = typeof error === 'string' ? error : error.message;
		const message = `\n${title}: ${description}`;
		fs.appendFileSync(this.logFile, message);
	}

	public async initialize() {
		if (!fs.existsSync(this.logFile)) {
			try {
				fs.writeFileSync(this.logFile, '');
			} catch (err) {
				console.error(`Error creating log file: ${err}`);
				return;
			}
		}

		process.on('unhandledRejection', async (reason: unknown, p: Promise<unknown>) => {
			console.error(reason, p);
			if (typeof reason === 'string' || reason instanceof Error) {
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
}

export default ErrorHandler;