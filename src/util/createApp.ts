import express from 'express';

export default function createApp(): express.Application {
	const app = express();

	// Define port (optional, adjust as needed)
	const port = process.env.PORT || 3000;

	// Define route handlers or other app settings here
	app.get('/twitch', (req: express.Request, res: express.Response) => {
		console.log('Requests: ', req);
		console.log('Response: ', res);
		// Handle the request for the /twitch route
		res.send('Hello from the /twitch route!');
	});

	return app;
}