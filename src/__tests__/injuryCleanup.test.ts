import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { InjuryModel } from '../database/models/injury';
import { deleteExpiredInjuries } from '../services/injuryCleanup';

describe('injury cleanup', () => {
	let mongod: MongoMemoryServer | null = null;

	beforeAll(async () => {
		const mongoUriFromEnv = process.env.MONGO_URI;
		if (mongoUriFromEnv) {
			// CI provides a MongoDB service; connect to it
			await mongoose.connect(mongoUriFromEnv, { dbName: 'test' } as any);
		} else {
			mongod = await MongoMemoryServer.create();
			const uri = mongod.getUri();
			await mongoose.connect(uri, { dbName: 'test' } as any);
		}
	});

	afterAll(async () => {
		await mongoose.disconnect();
		if (mongod) await mongod.stop();
	});

	beforeEach(async () => {
		await InjuryModel.deleteMany({});
	});

	test('removes injuries older than TTL', async () => {
		// create one document with an old injury and a recent injury
		const now = Date.now();
		const oldTimestamp = now - 1000 * 60 * 60 * 24 * 10; // 10 days ago
		const recentTimestamp = now - 1000 * 60 * 60; // 1 hour ago

		await InjuryModel.create({
			participantName: 'tester', injuries: [
				{ severity: 'high', duration: 10, description: 'old', timestamp: oldTimestamp },
				{ severity: 'low', duration: 5, description: 'recent', timestamp: recentTimestamp }
			]
		});

		// set TTL to 7 days
		process.env.INJURY_TTL_MS = String(7 * 24 * 60 * 60 * 1000);

		await deleteExpiredInjuries();

		const docs = await InjuryModel.find({});
		expect(docs).toHaveLength(1);
		expect(docs[0].injuries).toHaveLength(1);
		expect(docs[0].injuries[0].description).toBe('recent');
	});
});
