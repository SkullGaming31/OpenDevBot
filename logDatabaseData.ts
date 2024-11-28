import mongoose, { MongooseError } from 'mongoose';
import { TokenModel } from './src/database/models/tokenModel';

async function dropTokenCollection(): Promise<void> {
	try {
		// Ensure you are connected before trying to drop the collection
		await mongoose.connect('mongodb://localhost:27017/opendevbot', { autoIndex: true });

		// Use the native MongoDB driver to drop the collection
		const result = await TokenModel.collection.drop({ dbName: 'opendevbot', maxTimeMS: 10000 });
		console.log('TokenModel collection dropped successfully:', result);
	} catch (error: unknown) {
		if (error instanceof Error) {
			// Handle the error
			console.error('Error dropping TokenModel collection:', error);
		}
	}
}

// Wrapping in an async function
async function main() {
	try {
		await dropTokenCollection().catch((error: Error) => {
			if (error instanceof Error) {
				console.error('Error dropping TokenModel collection:', error);
			}
			if (error instanceof MongooseError) {
				// Handle the error
				console.error('Mongoose error:', error.cause + ': ' + error.name + ': ' + error.message + ': ' + error.stack);
			}
		});
	} catch (error: unknown) {
		if (error instanceof Error) {
			// Handle the error
			console.error('Error dropping TokenModel collection:', error);
		}
	} finally {
		await mongoose.disconnect();
	}
}

// Call the main function
main().catch((error: unknown) => {
	if (error instanceof Error) {
		console.error('Error: ', error.cause + ': ' + error.name + ': ' + error.message + ': ' + error.stack);
	}
});