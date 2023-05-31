import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import WebSocket from 'ws';
import helmet from 'helmet';
import morgan from 'morgan';
import middleware from '../auth/middleware';

import healthListener from '../api/health';
import { twitchRouter } from '../auth/Twitch';

/**
 * Creates and returns an instance of an Express application with middleware
 * for error handling, logging, and routing.
 */
export function createApp(port: string) {
	const app = express();

	const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
		// Log error to console
		console.error(err.stack);
		// Send error response to client
		res.status(500).json({
			message: 'Internal server error',
			error: err.message,
		});
	};
	
	// Add error logger middleware function to app
	app.use(cors());
	app.use(helmet());
	app.use(morgan('tiny'));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(express.static('../../public'));
	app.use(errorLogger);
	// app.use(middleware.logger);
	app.use('/auth/twitch', twitchRouter);
	app.use('/health', healthListener);

	app.get('/', (req: Request, res: Response) => {
		res.sendFile('C:/Development/opendevbot/public/index.html');
	});


	app.use(middleware.notFound);
	app.use(middleware.errorHandler);
	const server = app.listen(port, () => { console.log(`Server listening on http://localhost:${port}`); });

	return app;
}