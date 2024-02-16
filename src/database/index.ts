import mongoose, { Mongoose } from 'mongoose';

export async function initializeDatabase() {
	try {
		mongoose.set('strictQuery', true);
		const database: Mongoose = await mongoose.connect(process.env.MONGO_URI as string, {
			user: process.env.MONGO_USER as string,
			pass: process.env.MONGO_PASS as string,
			dbName: process.env.MONGO_DB as string,
		});
		console.log('Twitch Database Connected');

		mongoose.connection.on('disconnected', async () => {
			console.log('Twitch Database Disconnected');
			try {
				await mongoose.connect(process.env.MONGO_URI as string, {
					user: process.env.MONGO_USER as string,
					pass: process.env.MONGO_PASS as string,
					dbName: process.env.MONGO_DB as string,
				});
			} catch (error) {
				console.error('Error reconnecting to the database:', error);
			}
		});

		mongoose.connection.on('connected', () => {
			console.log('Twitch Database Connected');
		});

		mongoose.connection.on('reconnected', () => {
			console.log('Twitch Database Reconnected');
		});

		mongoose.connection.on('error', (err) => {
			console.error('Twitch Database Error:', err);
		});

	} catch (error) {
		console.error('Error initializing Twitch Database:', error);
	}
}