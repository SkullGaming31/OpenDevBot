import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import BankAccount from '../database/models/bankAccount';
import { deposit, transfer } from '../services/economyService';

/**
 * Higher-stress concurrency test for non-transactional fallback paths.
 * Increased operations compared to the smoke test to surface race conditions.
 */

let mongod: MongoMemoryServer;

// Increase timeout because this can be longer under high-stress settings.
// Make the actual work size configurable so CI/dev runs stay fast by default.
// Set STRESS_SCALE=1 for full stress, or a value <1 to reduce work.
const STRESS_SCALE = Number(process.env.STRESS_SCALE ?? 0.05); // default to 5% of full work
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

	// larger number of deposits concurrently (scaled by STRESS_SCALE)
	const depositTasks: Promise<any>[] = [];
	const baseDepositOps = 1000; // full-stress value
	const depositOps = Math.max(1, Math.floor(baseDepositOps * STRESS_SCALE));
	for (let i = 0; i < depositOps; i++) {
		const user = users[i % users.length];
		depositTasks.push(deposit(user, 5)); // each op +5
	}

	await Promise.all(depositTasks);

	// At this point total balance should be depositOps * 5
	const expectedTotal = depositOps * 5;
	const totalAfterDeposits = (await BankAccount.find({})).reduce((s, a) => s + a.balance, 0 as number);
	expect(totalAfterDeposits).toBe(expectedTotal);

	// Now perform a larger set of concurrent transfers between random users (scaled)
	const transferTasks: Promise<any>[] = [];
	const baseTransferOps = 3000;
	const transferOps = Math.max(1, Math.floor(baseTransferOps * STRESS_SCALE));
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
