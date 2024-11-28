import mongoose from 'mongoose';
import { TokenModel } from './src/database/models/tokenModel';

/**
 * Drops the 'tokens' collection in the MongoDB database.
 * @returns {Promise<void>}
 */
async function dropTokenCollection() {
	try {
		// Ensure you are connected before trying to drop the collection
		await mongoose.connect('mongodb://localhost:27017/opendevbot', { autoIndex: true });

		// Use the native MongoDB driver to drop the collection
		const result = await TokenModel.collection.drop();
		console.log('TokenModel collection dropped successfully:', result);
	} catch (error) {
		console.error('Error dropping TokenModel collection:', error);
	}
}

// Wrapping in an async function
async function main() {
	try {
		await dropTokenCollection();
	} finally {
		await mongoose.disconnect();
	}
}

// Call the main function
main().catch(console.error);