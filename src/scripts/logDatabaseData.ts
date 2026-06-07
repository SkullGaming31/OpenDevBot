import mongoose, { MongooseError } from 'mongoose';
import { TokenModel } from '../database/models/tokenModel';
import logger from '../util/logger';
import { requireDropAllowed } from './safety';

async function dropTokenCollection(): Promise<void> {
	try {
		// Throw early if not allowed
		requireDropAllowed(process.argv, process.env);
		// Ensure you are connected before trying to drop the collection
		// Ensure you are connected before trying to drop the collection
		await mongoose.connect('mongodb://localhost:27017/opendevbot', { autoIndex: true });

		// Use the native MongoDB driver to drop the collection
		const result = await TokenModel.collection.drop({ dbName: 'opendevbot', maxTimeMS: 10000 });
		logger.info('TokenModel collection dropped successfully:', result);
	} catch (error: unknown) {
		if (error instanceof Error) {
			// Handle the error
			logger.error('Error dropping TokenModel collection:', error);
		}
	}
}

// Wrapping in an async function
async function main() {
	try {
		await dropTokenCollection().catch((error: Error) => {
			if (error instanceof Error) {
				logger.error('Error dropping TokenModel collection:', error);
			}
			if (error instanceof MongooseError) {
				// Handle the error
				logger.error('Mongoose error:', error);
			}
		});
	} catch (error: unknown) {
		if (error instanceof Error) {
			// Handle the error
			logger.error('Error dropping TokenModel collection:', error);
		}
	} finally {
		await mongoose.disconnect();
	}
}

// Call the main function
main().catch((error: unknown) => {
	if (error instanceof Error) {
		logger.error('Error: ', error);
	}
});