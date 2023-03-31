import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

export function createApp() {
	const Port = process.env.PORT;
	const app = express();

	app.use(cors());
	app.use(helmet());
	app.use(morgan('tiny'));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
	app.use(express.static('../../public'));


	app.listen(Port, () => {console.log(`Server listening on http://localhost:${Port}`); });

	return app;
}