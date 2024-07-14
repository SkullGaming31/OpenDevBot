import mongoose, { ConnectOptions } from 'mongoose';
import './models/userModel';

class Database {
	private uri: string;

	constructor(uri: string) {
		this.uri = uri;
	}

	public async connect(): Promise<void> {
		try {
			if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
				mongoose.set('debug', true);
			} else {
				mongoose.set('debug', false);
			}
			
			await mongoose.connect(this.uri, {
				serverSelectionTimeoutMS: 5000,
				dbName: 'opendevbot',
			} as ConnectOptions);

			// console.log('Database connection successful');

			const connectionState = mongoose.connection.readyState;

			switch (connectionState) {
				case 0:
					console.log('Database Disconnected');
					break;
				case 1:
					console.log('Database Connected Successfully');
					break;
				case 2:
					console.log('Database Connecting');
					break;
				case 3:
					console.log('Database Disconnecting');
					break;
				default:
					console.log('Unknown Database Connection State');
					break;
			}
			// Perform a no-op operation to ensure the database is created
			await mongoose.connection.db.command({ ping: 1 });
			console.log(`Database '${mongoose.connection.db.databaseName}' ensured.`);
			// await this.dropUsersCollection();
		} catch (error) {
			console.error('Database connection error:', error);
			throw error;
		}
	}

	public async dropUsersCollection(): Promise<void> {
		try {
			await mongoose.connection.dropCollection('users');
			console.log('Users collection dropped');
		} catch (error) {
			console.error('Error dropping users collection:', error);
			throw error;
		}
	}
}

export default Database;