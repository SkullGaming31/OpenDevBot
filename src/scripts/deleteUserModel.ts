#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../util/logger';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
	const apply = process.argv.includes('--apply');
	const maybeUri = process.argv.find(arg => arg.startsWith('mongodb'));
	const connectUri = maybeUri || uri;

	logger.info('Connecting to', maybeUri ? '[cli-provided uri]' : connectUri);
	await mongoose.connect(connectUri, { dbName: process.env.DB_NAME || undefined });

	const { UserModel } = await import('../database/models/userModel');

	const count = await UserModel.countDocuments();
	logger.info(`Users collection contains ${count} documents.`);

	const sample = await UserModel.find({}).limit(5).lean();
	logger.info('Sample documents:', JSON.stringify(sample, null, 2));

	if (!apply) {
		logger.info('\nDry-run only. To delete all UserModel documents run with --apply');
		await mongoose.disconnect();
		return;
	}

	logger.info('Deleting all UserModel documents...');
	const res = await UserModel.deleteMany({});
	logger.info(`Deleted ${res.deletedCount} documents.`);

	await mongoose.disconnect();
}

main().catch(err => {
	logger.error('Error', err);
	process.exit(1);
});
