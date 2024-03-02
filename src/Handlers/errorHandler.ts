import fs from 'fs';
import { Error } from 'mongoose';
import { client } from '../discord';

export async function initializeErrorHandling(logFile = 'C:/Development/OpenDevBot/src/dev logs/logs.log') {
	if (!fs.existsSync(logFile)) {
		try {
			fs.writeFileSync(logFile, '');
		} catch (err) {
			console.error(`Error creating log file: ${err}`);
			return;
		}
	}

	const writeError = async (error: Error | string, title: string) => {
		const description = typeof error === 'string' ? error : error.message;
		const message = `\n${title}: ${description}`;
		fs.appendFileSync(logFile, message);
	};

	client.on('error', async (err: Error) => {
		console.error(err);
		await writeError(err, 'Discord Error');
	});

	client.on('warn', async (info: string) => {
		console.warn('Discord Warning:', info);
		await writeError(info, 'Discord Warning');
	});

	process.on('unhandledRejection', async (reason: unknown, p: Promise<unknown>) => {
		console.error(reason, p);
		if (typeof reason === 'string') {
			await writeError(reason, 'Unhandled Rejection/Catch');
		} else if (reason instanceof Error) {
			await writeError(reason, 'Unhandled Rejection/Catch');
		} else {
			console.error('Unhandled rejection with unknown reason:', reason);
		}
	});

	process.on('uncaughtException', async (err: Error) => {
		console.error(err);
		await writeError(err, 'Uncaught Exception');
	});

	// Other error handlers...
}