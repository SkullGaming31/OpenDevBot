import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from '../auth/middleware/Logger';

import { twitchRouter } from '../auth/Twitch';
import healthListener from '../api/health';
import { homeRouter } from '../api/home';
import { aboutRouter } from '../api/about';

export function createApp() {
	const port = process.env.PORT || '3002';
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
	app.use(logger);



	app.use('/auth/twitch', twitchRouter);

	app.use('/home', homeRouter);
	app.use('/about', aboutRouter);

	app.use('/health', healthListener);


	app.listen(port, () => { console.log(`Server listening on http://localhost:${port}`); });

	return app;
}