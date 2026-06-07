#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../util/logger';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.DOCKER_URI || 'mongodb://localhost:27017/opendevbot';

async function main() {
	const arg = process.argv[2];
	const maybeUri = process.argv[3];
	if (!arg) {
		logger.error('Usage: ts-node scripts/dumpUser.ts <username|id> [mongo-uri]');
		logger.error('You can also set MONGO_URI or DOCKER_URI in your environment.');
		process.exit(2);
	}

	const connectUri = maybeUri || uri;
	logger.info('Connecting to', maybeUri ? '[cli-provided uri]' : connectUri);
	await mongoose.connect(connectUri, { dbName: process.env.DB_NAME || undefined });

	// Import models using project paths so they pick up the same schemas
	const { UserModel } = await import('../database/models/userModel');
	const BankAccount = (await import('../database/models/bankAccount')).default;

	// Try numeric id first, then username
	const queries = [
		{ id: arg },
		{ username: arg }
	];

	let userDoc = null;
	for (const q of queries) {
		userDoc = await UserModel.findOne(q).lean();
		if (userDoc) break;
	}

	if (!userDoc) {
		logger.info('No UserModel document found for', arg);
	} else {
		logger.info('UserModel document:');
		logger.info(JSON.stringify(userDoc, null, 2));
	}

	// If we have an id field on the user doc, query bank by that; otherwise try arg
	const bankKey = userDoc?.id || arg;
	const bankDoc = await BankAccount.findOne({ userId: bankKey }).lean();
	if (!bankDoc) {
		logger.info('No BankAccount found for', bankKey);
	} else {
		logger.info('BankAccount document:');
		logger.info(JSON.stringify(bankDoc, null, 2));
	}

	await mongoose.disconnect();
}

main().catch(err => {
	logger.error('Error', err);
	process.exit(1);
});
