/* eslint-disable quotes */
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from '../auth/middleware/Logger';

import { twitchRouter } from '../auth/Twitch';

export function createApp() {
	const port = process.env.PORT || '3002';
	const app = express();
	
	app.use(cors());
	app.use(helmet());
	app.use(morgan('tiny'));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(express.static('public'));
	app.use(logger);



	app.use('/auth/twitch', twitchRouter);


	app.listen(port, () => { console.log(`Server listening on http://localhost:${port}`); });

	return app;
}