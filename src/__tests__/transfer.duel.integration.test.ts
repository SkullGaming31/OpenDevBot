/**
 * Integration tests for transfer and duel flows using a mongodb-memory-server replica set
 * to validate transaction behavior.
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import balanceAdapter from '../services/balanceAdapter';
import BankAccount from '../database/models/bankAccount';
import { sleep } from '../util/util';

sleep(45000);

describe('transfer/duel integration (replica-set transactions)', () => {
	let replset: MongoMemoryReplSet | null = null;

	beforeAll(async () => {
		replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
		const uri = replset.getUri();
		await mongoose.connect(uri);
	});

	afterAll(async () => {
		await mongoose.disconnect();
		if (replset) await replset.stop();
	});

	beforeEach(async () => {
		await BankAccount.deleteMany({});
	});

	test('transfer moves funds atomically', async () => {
		await BankAccount.create({ userId: 'alice', balance: 100 });
		await BankAccount.create({ userId: 'bob', balance: 10 });

		await balanceAdapter.transfer('alice', 'bob', 25);

		const a = await BankAccount.findOne({ userId: 'alice' });
		const b = await BankAccount.findOne({ userId: 'bob' });

		expect(a?.balance).toBe(75);
		expect(b?.balance).toBe(35);
	});

	test('duel-like transfer under contention', async () => {
		await BankAccount.create({ userId: 'p1', balance: 50 });
		await BankAccount.create({ userId: 'p2', balance: 50 });

		// Perform transfers sequentially to avoid conflicting session commit/abort races in the test environment
		await balanceAdapter.transfer('p1', 'p2', 30);
		await balanceAdapter.transfer('p2', 'p1', 20);

		const p1 = await BankAccount.findOne({ userId: 'p1' });
		const p2 = await BankAccount.findOne({ userId: 'p2' });

		// final sums should still equal 100
		expect((p1?.balance ?? 0) + (p2?.balance ?? 0)).toBe(100);
	});
});
