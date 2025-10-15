import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import BankAccount from '../database/models/bankAccount';
import { deposit, transfer } from '../services/economyService';

/**
 * Higher-stress concurrency test for non-transactional fallback paths.
 * Increased operations compared to the smoke test to surface race conditions.
 */

let mongod: MongoMemoryServer;

// Increase Jest timeout because this is a higher-stress, longer-running test
jest.setTimeout(60000);

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

test('higher stress concurrent deposits and transfers remain consistent', async () => {
	const users = ['u1', 'u2', 'u3', 'u4', 'u5'];

	// larger number of deposits concurrently
	const depositTasks: Promise<any>[] = [];
	const depositOps = 1000; // increased from 100
	for (let i = 0; i < depositOps; i++) {
		const user = users[i % users.length];
		depositTasks.push(deposit(user, 5)); // each op +5
	}

	await Promise.all(depositTasks);

	// At this point total balance should be depositOps * 5
	const expectedTotal = depositOps * 5;
	const totalAfterDeposits = (await BankAccount.find({})).reduce((s, a) => s + a.balance, 0 as number);
	expect(totalAfterDeposits).toBe(expectedTotal);

	// Now perform a larger set of concurrent transfers between random users
	const transferTasks: Promise<any>[] = [];
	const transferOps = 3000; // increased from 200
	for (let i = 0; i < transferOps; i++) {
		const from = users[Math.floor(Math.random() * users.length)];
		let to = users[Math.floor(Math.random() * users.length)];
		if (to === from) to = users[(users.indexOf(from) + 1) % users.length];
		transferTasks.push(transfer(from, to, 1).catch(() => undefined));
	}

	await Promise.all(transferTasks);

	// The sum across all accounts must still equal expectedTotal
	const finalAccounts = await BankAccount.find({});
	const finalTotal = finalAccounts.reduce((s, a) => s + a.balance, 0 as number);
	expect(finalTotal).toBe(expectedTotal);

	// Also verify no account became negative
	for (const a of finalAccounts) {
		expect(a.balance).toBeGreaterThanOrEqual(0);
	}
});
