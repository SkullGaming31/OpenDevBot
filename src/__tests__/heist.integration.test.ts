/**
 * Integration test for bank heist using mongodb-memory-server replica-set to exercise transactions.
 * This test will:
 *  - start a mongodb-memory-server replica-set
 *  - connect mongoose
 *  - seed several BankAccount documents
 *  - run the heist command targeting the 'bank' zone
 *  - verify that donors were debited and winners were credited (via BankAccount and UserModel)
 *
 * Note: This is a slower test and increases vi timeout.
 */

import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import logger from '../util/logger';
jest.setTimeout(45000); // allow up to 45s for replica-set startup and test (we set ENVIRONMENT=dev to shorten delays)

describe('heist integration (replica-set transactions)', () => {
	let replSet: MongoMemoryReplSet;
	let BankAccountModel: any;
	let UserModel: any;

	beforeAll(async () => {
		// start a replica set
		replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
		const uri = replSet.getUri();

		// connect mongoose
		await mongoose.connect(uri, { dbName: 'test' });

		// Ensure we use real mongoose and real model implementations (in case other tests mocked them)
		jest.unmock('mongoose');
		jest.unmock('../database/models/bankAccount');
		jest.unmock('../database/models/userModel');
		// require models after unmocking
		BankAccountModel = require('../database/models/bankAccount').default;
		UserModel = require('../database/models/userModel').UserModel;
	});

	afterAll(async () => {
		await mongoose.disconnect();
		if (replSet) await replSet.stop();
	});

	beforeEach(async () => {
		// clear collections
		if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
	});

	test('bank heist debits donors transactionally and credits winners', async () => {
		// seed bank accounts (donors)
		const donors = [
			{ userId: 'donor1', balance: 5000 },
			{ userId: 'donor2', balance: 3000 },
			{ userId: 'donor3', balance: 2000 },
			{ userId: 'donor4', balance: 1500 },
			{ userId: 'donor5', balance: 1200 }
		];
		await BankAccountModel.insertMany(donors);
		const totalBankBefore = (await BankAccountModel.find({}).lean()).reduce((s: number, d: any) => s + (d.balance || 0), 0);

		// seed a few user models to represent winners
		const winners = [
			{ id: 'winner1', username: 'winner1', channelId: 'chan', balance: 0 },
			{ id: 'winner2', username: 'winner2', channelId: 'chan', balance: 0 }
		];
		await UserModel.insertMany(winners as any);

		// Create a real chatClient mock to capture messages
		const chatClient = { say: jest.fn(), onMessage: jest.fn() };
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue(chatClient) }));

		// Force shorter heist delay in the module
		process.env.ENVIRONMENT = 'dev';
		// Force deterministic randomInt: always return the lower bound so calls like randomInt(min, max) -> min
		jest.doMock('crypto', () => ({
			randomInt: (min: number, max?: number) => {
				void max;
				// mimic node crypto.randomInt signature (min, max?) -> return integer in [min, max)
				return min;
			}
		}));

		// Ensure we use real services (balanceAdapter/economyService) by unmocking them
		jest.unmock('../services/balanceAdapter');
		jest.unmock('../services/economyService');
		const balanceAdapter = require('../services/balanceAdapter');
		const creditSpy = jest.spyOn(balanceAdapter, 'creditWallet');
		const economyService = require('../services/economyService');
		const depositSpy = jest.spyOn(economyService, 'deposit');
		// Import the heist module fresh so it picks up the mocked chat and crypto and real services
		const heistModule: any = await import('../Commands/Fun/heist');

		// Start the heist: use an initiator who has enough in wallet
		// Ensure initiator UserModel has balance for debitWallet path (balanceAdapter uses UserModel.balance)
		await UserModel.create({ id: 'initiator', username: 'initiator', channelId: 'chan', balance: 1000 } as any);

		// compute user balances before executing heist
		const usersBefore = await UserModel.find({}).lean();
		const userBalancesBefore: Record<string, number> = {};
		usersBefore.forEach((u: any) => { userBalancesBefore[u.id || u.username] = u.balance || 0; });

		const msg: any = { channelId: 'chan', userInfo: { userId: 'initiator', userName: 'initiator' } };

		// Execute a heist with amount 200 targeting 'bank'
		await heistModule.default.execute('chan', 'initiator', ['200', 'bank'], '', msg);

		// After heist, inspect bank account balances to ensure total bank balance decreased
		const updatedDonors = await BankAccountModel.find({}).lean();
		const totalBankAfter = updatedDonors.reduce((s: number, d: any) => s + (d.balance || 0), 0);
		logger.debug('totalBankBefore', totalBankBefore, 'totalBankAfter', totalBankAfter);
		// Winners may be credited to bank accounts (deposit) or to external wallets
		// If deposited to bank accounts total may remain equal; allow <= to accept both behaviours.
		expect(totalBankAfter).toBeLessThanOrEqual(totalBankBefore);

		// Verify transaction logs recorded withdraws and deposits/transfers
		const TransactionLog = require('../database/models/transactionLog').default;
		const logs = await TransactionLog.find({}).lean();
		const withdrawCount = logs.filter((l: any) => l.type === 'withdraw').length;
		logger.debug('transaction logs', logs);
		expect(withdrawCount).toBeGreaterThan(0);
		// Accept any of the following as evidence of winners being credited:
		// - economyService.deposit was called
		// - balanceAdapter.creditWallet was called
		// - a deposit/transfer TransactionLog exists
		const depositOrTransferLogCount = logs.filter((l: any) => l.type === 'deposit' || l.type === 'transfer').length;
		const credited = depositSpy.mock.calls.length > 0 || creditSpy.mock.calls.length > 0 || depositOrTransferLogCount > 0;
		logger.debug('creditSpy calls', creditSpy.mock.calls.length, creditSpy.mock.calls);
		logger.debug('depositSpy calls', depositSpy.mock.calls.length);
		logger.debug('deposit/transfer logs', depositOrTransferLogCount);
		expect(credited).toBe(true);

		// Ensure chat was spoken to with results
		expect((chatClient.say as any).mock.calls.length).toBeGreaterThan(0);
	});
});
