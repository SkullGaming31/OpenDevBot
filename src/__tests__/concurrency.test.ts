import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import BankAccount from '../database/models/bankAccount';
import { deposit, transfer } from '../services/economyService';

/**
 * Concurrency/stress test for non-transactional fallback paths.
 * Uses a single-node mongodb-memory-server (no transactions) so economyService will use
 * the atomic findOneAndUpdate fallback paths. We simulate many concurrent deposits and
 * transfers and assert that the final total balances are consistent.
 */

let mongod: MongoMemoryServer;

beforeAll(async () => {
	mongod = await MongoMemoryServer.create();
	const uri = mongod.getUri();
	await mongoose.connect(uri);
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongod.stop();
});

beforeEach(async () => {
	await BankAccount.deleteMany({});
});

test('concurrent deposits and transfers remain consistent', async () => {
	const users = ['u1', 'u2', 'u3', 'u4'];

	// initial deposits concurrently
	const depositTasks: Promise<any>[] = [];
	for (let i = 0; i < 100; i++) {
		const user = users[i % users.length];
		depositTasks.push(deposit(user, 10)); // each op +10
	}

	await Promise.all(depositTasks);

	// At this point total balance should be 100 * 10 = 1000
	const totalAfterDeposits = (await BankAccount.find({})).reduce((s, a) => s + a.balance, 0 as number);
	expect(totalAfterDeposits).toBe(1000);

	// Now perform concurrent transfers between random users
	const transferTasks: Promise<any>[] = [];
	for (let i = 0; i < 200; i++) {
		const from = users[Math.floor(Math.random() * users.length)];
		let to = users[Math.floor(Math.random() * users.length)];
		if (to === from) to = users[(users.indexOf(from) + 1) % users.length];
		transferTasks.push(transfer(from, to, 3).catch(() => undefined));
	}

	await Promise.all(transferTasks);

	// The sum across all accounts must still equal 1000
	const finalAccounts = await BankAccount.find({});
	const finalTotal = finalAccounts.reduce((s, a) => s + a.balance, 0 as number);
	expect(finalTotal).toBe(1000);

	// Also verify no account became negative
	for (const a of finalAccounts) {
		expect(a.balance).toBeGreaterThanOrEqual(0);
	}
});
