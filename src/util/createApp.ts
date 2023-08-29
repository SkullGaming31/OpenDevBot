import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import middleware from '../auth/middleware';

import { apiRouter } from '../api';
import healthListener from '../api/health';

/**
 * Creates and returns an instance of an Express application with middleware
 * for error handling, logging, and routing.
 */
export function createApp(port: string) {
	const app = express();

	const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
		// Log error to console
		console.error(err);
		// Send error response to client
		res.status(500).json({
			message: 'Internal server error',
			error: err
		});
	};
	app.use(cors());
	app.use(helmet());
	app.use(morgan('tiny'));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(express.static('public'));
	app.use(errorLogger);
	// app.use(middleware.logger);
	app.use('/api', apiRouter);
	// app.use('/auth/twitch', twitchRouter);
	app.use('/health', healthListener);

	const limiter = rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // Limit each IP to 100 requests per windowMs
	});

	app.get('/', limiter, (req: Request, res: Response) => {
		res.sendFile('C:/Development/opendevbot/public/index.html');
	});


	app.use(middleware.notFound);
	app.use(middleware.errorHandler);
	const server = app.listen(port, () => { console.log(`Server listening on http://localhost:${port}`); });

	return app;
}