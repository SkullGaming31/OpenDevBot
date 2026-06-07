import { config } from 'dotenv';
config();

import Database from '../database';
import logger from '../util/logger';
import knownBotsModel from '../database/models/knownBotsModel';
import mongoose from 'mongoose';

async function main() {
	try {
		const env = process.env.ENVIRONMENT as string;
		void env;
		const rawUri = process.env.MONGO_URI || process.env.DOCKER_URI || '';

		// Trim optional surrounding quotes from env vars (dotenv may preserve quotes)
		const trimQuotes = (s: string | undefined) => (s ?? '').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
		const userEnv = trimQuotes(process.env.MONGO_USER);
		const passEnv = trimQuotes(process.env.MONGO_PASS);
		const dbEnv = trimQuotes(process.env.MONGO_DB);

		let mongoURI = rawUri;
		// If the URI is a template containing placeholders like {MONGO_USER}, expand them
		if (mongoURI.includes('{MONGO_USER}') || mongoURI.includes('{MONGO_PASS}') || mongoURI.includes('{MONGO_DB}')) {
			if (!userEnv || !passEnv) {
				logger.error('MONGO_URI contains placeholders but MONGO_USER or MONGO_PASS is not set. Aborting.');
				process.exit(1);
			}
			const encUser = encodeURIComponent(userEnv);
			const encPass = encodeURIComponent(passEnv);
			mongoURI = mongoURI.replace(/\{MONGO_USER\}/g, encUser).replace(/\{MONGO_PASS\}/g, encPass).replace(/\{MONGO_DB\}/g, encodeURIComponent(dbEnv || ''));
		}

		if (!mongoURI) {
			logger.error('No MongoDB URI configured in MONGO_URI or DOCKER_URI. Aborting.');
			process.exit(1);
		}

		// Log a masked URI (don't print password) — avoid complex regex to satisfy linters
		try {
			const schemeIndex = mongoURI.indexOf('://');
			let masked = mongoURI;
			if (schemeIndex !== -1) {
				const atIndex = mongoURI.indexOf('@', schemeIndex + 3);
				if (atIndex !== -1) {
					masked = mongoURI.slice(0, schemeIndex + 3) + '****' + mongoURI.slice(atIndex);
				}
			}
			logger.info(`Connecting to MongoDB: ${masked}`);
		} catch (e) {
			logger.info('Connecting to MongoDB (masked)');
		}

		const db = new Database(mongoURI);
		await db.connect();

		const now = new Date();

		// Backfill addedAt where missing
		const addedAtResult = await knownBotsModel.updateMany(
			{ $or: [{ addedAt: { $exists: false } }, { addedAt: null }] },
			{ $set: { addedAt: now } }
		);

		// Backfill addedBy where missing
		const addedByResult = await knownBotsModel.updateMany(
			{ $or: [{ addedBy: { $exists: false } }, { addedBy: null }] },
			{ $set: { addedBy: 'SkullGamingHQ' } }
		);

		// Backfill addedFromChannel where missing
		const addedFromResult = await knownBotsModel.updateMany(
			{ $or: [{ addedFromChannel: { $exists: false } }, { addedFromChannel: null }] },
			{ $set: { addedFromChannel: 'SkullGamingHQ' } }
		);

		logger.info(`Backfill complete. addedAt modified: ${getModifiedCount(addedAtResult)}, addedBy modified: ${getModifiedCount(addedByResult)}, addedFromChannel modified: ${getModifiedCount(addedFromResult)}`);

		await mongoose.disconnect();
		process.exit(0);
	} catch (err: unknown) {
		if (err instanceof Error) logger.error('Backfill failed:', err.message, err.stack);
		else logger.error('Backfill failed:', String(err));
		try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
		process.exit(1);
	}
}

function getModifiedCount(res: unknown): number {
	// Mongoose / Node driver may return different shapes depending on version
	if (res == null) return 0;
	if (typeof res === 'object') {
		const r = res as Record<string, unknown>;
		const candidate = r.modifiedCount ?? r.nModified ?? r.modified ?? r.n ?? 0;
		if (typeof candidate === 'number') return candidate;
		const asNumber = Number(candidate ?? 0);
		return Number.isFinite(asNumber) ? asNumber : 0;
	}
	return 0;
}

void main();
