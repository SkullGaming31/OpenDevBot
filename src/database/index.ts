import mongoose, { ConnectOptions } from 'mongoose';
import ENVIRONMENT from '../util/env';
import logger from '../util/logger';
import './models/userModel';

class Database {
	private uri: string;

	constructor(uri: string) {
		this.uri = uri;
	}

	/**
	 * Asynchronously connects to the database using the provided URI.
	 * Sets debug mode based on the environment.
	 * Logs the connection status of the database.
	 * Ensures the database is created by performing a no-op operation.
	 * @returns Promise<void>
	 */
	public async connect(): Promise<void> {
		try {
			if (ENVIRONMENT === 'dev' || ENVIRONMENT === 'debug') {
				mongoose.set('debug', false);
			} else {
				mongoose.set('debug', false);
			}

			await mongoose.connect(this.uri, { serverSelectionTimeoutMS: 5000, dbName: 'opendevbot' } as ConnectOptions);

			const connectionState = mongoose.connection.readyState;

			switch (connectionState) {
				case 0:
					logger.info('Database Disconnected');
					break;
				case 1:
					logger.info('Database Connected Successfully');
					break;
				case 2:
					logger.info('Database Connecting');
					break;
				case 3:
					logger.info('Database Disconnecting');
					break;
				default:
					logger.info('Unknown Database Connection State');
					break;
			}
			await mongoose.connection.db?.command({ ping: 1 });
			logger.info(`Database '${mongoose.connection.db?.databaseName}' ensured.`);
			// await this.dropUsersCollection();
		} catch (error) {
			logger.error('Database connection error:', error);
			throw error;
		}
	}

	/**
	 * @description
	 * Drops the 'users' collection in the database.
	 * @returns Resolves if the collection is dropped successfully, rejects with an error if it fails.
	 */
	public async dropUsersCollection(): Promise<void> {
		try {
			await mongoose.connection.dropCollection('users');
			logger.info('Users collection dropped');
		} catch (error) {
			logger.error('Error dropping users collection:', error);
			throw error;
		}
	}
}

export default Database;