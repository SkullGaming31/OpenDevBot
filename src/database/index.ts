import mongoose, { ConnectOptions } from 'mongoose';

class Database {
	private uri: string;

	constructor(uri: string) {
		this.uri = uri;
	}

	public async connect(): Promise<void> {
		try {
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
		} catch (error) {
			console.error('Database connection error:', error);
			throw error;
		}
	}
}

export default Database;