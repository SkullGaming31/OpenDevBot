import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
config();

export function createApp() {
    const Port = process.env.PORT;
	const app = express();

	app.use(cors());
	app.use(helmet());
	app.use(morgan('tiny'));
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());
    app.use(express.static('../../public'));

	app.get('/', (req: Request, res: Response, next: NextFunction) => {
		res.json({ 
            msg: 'Home Page'
        });
		next();
	});
	app.get('/about', (req: Request, res: Response, next: NextFunction) => {
		res.json({
            msg: 'About Page'
        });
		next();
	});

	// app.use('/auth/twitch', require('./auth/twitch'));// not currently working, issue with QueryParam

    app.listen(Port, () => {console.log(`Server listening on http://localhost:${Port}`); });

    return app;
}