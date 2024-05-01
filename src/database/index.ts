import mongoose, { Mongoose } from 'mongoose';

class Database {
	private mongoose: Mongoose;

	constructor() {
		this.mongoose = mongoose;
		this.mongoose.set('strictQuery', true);
		this.setupEventListeners();
	}

	private setupEventListeners() {
		this.mongoose.connection.on('disconnected', async () => {
			console.log('Twitch Database Disconnected');
			try {
				await this.mongoose.connect(process.env.MONGO_URI as string, {
					user: process.env.MONGO_USER as string,
					pass: process.env.MONGO_PASS as string,
					dbName: process.env.MONGO_DB as string,
				});
			} catch (error) {
				console.error('Error reconnecting to the database:', error);
			}
		});

		this.mongoose.connection.on('connected', () => {
			console.log('Twitch Database Connected');
		});

		this.mongoose.connection.on('reconnected', () => {
			console.log('Twitch Database Reconnected');
		});

		this.mongoose.connection.on('error', (err) => {
			console.error('Twitch Database Error:', err);
		});
	}

	public async initialize() {
		try {
			await this.mongoose.connect(process.env.MONGO_URI as string, {
				user: process.env.MONGO_USER as string,
				pass: process.env.MONGO_PASS as string,
				dbName: process.env.MONGO_DB as string,
			});
		} catch (error) {
			console.error('Error initializing Twitch Database:', error);
		}
	}	

}
export default Database;