import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import logger from '../util/logger';

function trimQuotes(s: string | undefined) {
	return (s ?? '').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

async function main() {
	const rawUri = process.env.MONGO_URI || process.env.DOCKER_URI || '';
	const userEnv = trimQuotes(process.env.MONGO_USER);
	const passEnv = trimQuotes(process.env.MONGO_PASS);
	const dbEnv = trimQuotes(process.env.MONGO_DB);

	let mongoURI = rawUri;
	if (mongoURI.includes('{MONGO_USER}') || mongoURI.includes('{MONGO_PASS}') || mongoURI.includes('{MONGO_DB}')) {
		if (!userEnv || !passEnv) {
			logger.error('MONGO_URI contains placeholders but MONGO_USER or MONGO_PASS is not set.');
			process.exit(2);
		}
		const encUser = encodeURIComponent(userEnv);
		const encPass = encodeURIComponent(passEnv);
		mongoURI = mongoURI.replace(/\{MONGO_USER\}/g, encUser).replace(/\{MONGO_PASS\}/g, encPass).replace(/\{MONGO_DB\}/g, encodeURIComponent(dbEnv || ''));
	}

	if (!mongoURI) {
		logger.error('No MongoDB URI configured in MONGO_URI or DOCKER_URI.');
		process.exit(2);
	}

	// Mask the URI for logging
	try {
		const schemeIndex = mongoURI.indexOf('://');
		let masked = mongoURI;
		if (schemeIndex !== -1) {
			const atIndex = mongoURI.indexOf('@', schemeIndex + 3);
			if (atIndex !== -1) {
				masked = mongoURI.slice(0, schemeIndex + 3) + '****' + mongoURI.slice(atIndex);
			}
		}
		logger.info('Using MongoDB URI (masked):', masked);
	} catch (e) {
		logger.info('Using MongoDB URI (masked)');
	}

	// Attempt a short connection to surface auth errors
	try {
		await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
		logger.info('MongoDB connection: SUCCESS');
		await mongoose.disconnect();
		process.exit(0);
	} catch (err: unknown) {
		logger.error('MongoDB connection: FAILED');
		if (err instanceof Error) {
			logger.error(err.name + ':', err.message);
			// print stack for diagnosis
			logger.error(err.stack);
		} else {
			logger.error(String(err));
		}
		try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
		process.exit(1);
	}
}

void main();
