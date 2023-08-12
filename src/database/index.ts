import mongoose, { ConnectOptions, MongooseError, connection } from 'mongoose';
import { sleep } from '../util/util';

export async function initializeDatabase() {
	try {
		mongoose.set('strictQuery', true);
		const database = await mongoose.connect(process.env.MONGO_URI as string, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			user: process.env.MONGO_USER as string,
			pass: process.env.MONGO_PASS as string,
			dbName: process.env.MONGO_DB as string
		} as ConnectOptions);
		console.log('Twitch Database Connected');

		mongoose.connection.on('disconnected', async () => {
			console.log('Twitch Database Disconnected');
			// connection.removeAllListeners();
			await mongoose.disconnect();
			sleep(1000);
			try {
				if (mongoose.connection.readyState === 0) {
					await database.connect(process.env.MONGO_URI as string);
				} else { console.log('error connecting to the database'); }
			} catch (error) {
				console.error(error);
			}
		});

		mongoose.connection.on('connected', () => {
			console.log('Twitch Database Connected');
		});

		mongoose.connection.on('reconnected', () => {
			console.log('Twitch Database re-Connected');
		});

		mongoose.connection.on('error', (err: MongooseError) => {
			console.error('Twitch Database Error:', err);
			connection.removeAllListeners();
			mongoose.disconnect();
		});

	} catch (error: any) {
		console.error('Twitch Database Error:', error);
		mongoose.disconnect();
	}
}