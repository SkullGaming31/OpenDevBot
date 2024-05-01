import fs from 'fs';
import { Error } from 'mongoose';

class ErrorHandler {
	private logFile: string;

	constructor(logFile = 'C:/Development/OpenDevBot/src/dev logs/logs.log') {
		this.logFile = logFile;
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