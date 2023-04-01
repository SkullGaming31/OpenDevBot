import mongoose, { ConnectOptions, Error } from 'mongoose';
import './models/AuthTokenModel';
import './models/user';

export async function init() {
	try {
		mongoose.set('strictQuery', true);
		await mongoose.connect(process.env.MONGO_URI as string, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			user: process.env.MONGO_USER as string,
			pass: process.env.MONGO_PASS as string,
			dbName: process.env.MONGO_DB as string
		} as ConnectOptions);
		console.log('Twitch Database Connected');

		mongoose.connection.on('disconnected', () => {
			console.log('Twitch Database Disconnected');
			mongoose.connection.removeAllListeners();
			mongoose.disconnect();
		});

		mongoose.connection.on('connected', () => {
			console.log('Twitch Database Connected');
		});

		mongoose.connection.on('error', (err: mongoose.Error) => {
			console.error('Twitch Database Error:', err.message);
			mongoose.connection.removeAllListeners();
			mongoose.disconnect();
		});

	} catch (error: any) {
		console.error('Twitch Database Error:', error.message);
		mongoose.disconnect();
	}
}