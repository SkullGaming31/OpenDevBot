import { jest } from '@jest/globals';

describe('balanceAdapter', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('deposit mirrors to UserModel for numeric and username ids and handles mirror failure', async () => {
		// Mock economyService.deposit
		const acct = { userId: '123', balance: 50 };
		jest.doMock('../services/economyService', () => ({ getOrCreateAccount: (jest.fn() as any), deposit: (jest.fn() as any).mockResolvedValue(acct) }));

		// Mock UserModel.updateOne to capture calls
		const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));

		const warn = (jest.fn() as any);
		jest.doMock('../util/logger', () => ({ warn }));

		const ba = await import('../services/balanceAdapter');

		// numeric id path
		const res = await ba.deposit('123', 10);
		expect(res).toBe(acct);
		expect(updateOne).toHaveBeenCalled();

		// username path
		updateOne.mockClear();
		const res2 = await ba.deposit('alice', 5);
		expect(res2).toBe(acct);
		expect(updateOne).toHaveBeenCalled();

		// simulate mirror failure — economyService still returns
		updateOne.mockImplementationOnce(() => { throw new Error('db fail'); });
		const res3 = await ba.deposit('bob', 7);
		expect(res3).toBe(acct);
		expect(warn).toHaveBeenCalled();
	});

	test('withdraw mirrors and returns account', async () => {
		const acct = { userId: 'u1', balance: 20 };
		jest.doMock('../services/economyService', () => ({ withdraw: (jest.fn() as any).mockResolvedValue(acct) }));
		const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));
		const warn = (jest.fn() as any);
		jest.doMock('../util/logger', () => ({ warn }));

		const ba = await import('../services/balanceAdapter');
		const res = await ba.withdraw('999', 5);
		expect(res).toBe(acct);
		expect(updateOne).toHaveBeenCalled();
	});

	test('creditWallet and debitWallet numeric and username behavior', async () => {
		const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
		const findOneAndUpdate = (jest.fn() as any).mockResolvedValue({});
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne, findOneAndUpdate } }));
		const warn = (jest.fn() as any);
		jest.doMock('../util/logger', () => ({ warn }));

		const ba = await import('../services/balanceAdapter');

		// numeric id
		await ba.creditWallet('123', 10);
		expect(updateOne).toHaveBeenCalled();

		// username + channelId path
		updateOne.mockClear();
		await ba.creditWallet('name', 5, 'name', 'chan1');
		expect(updateOne).toHaveBeenCalled();

		// debitWallet numeric success/fail
		findOneAndUpdate.mockResolvedValueOnce({}).mockResolvedValueOnce(null);
		const ok = await ba.debitWallet('123', 2);
		expect(ok).toBe(true);
		const nok = await ba.debitWallet('123', 999);
		expect(nok).toBe(false);
	});

	test('transfer delegates to economyService and mirrors, warns on mirror failure', async () => {
		const transferMock = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../services/economyService', () => ({ transfer: transferMock }));
		const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));
		const warn = (jest.fn() as any);
		jest.doMock('../util/logger', () => ({ warn }));

		const ba = await import('../services/balanceAdapter');
		await ba.transfer('fromUser', 'toUser', 5);
		expect(transferMock).toHaveBeenCalled();
		expect(updateOne).toHaveBeenCalled();

		// simulate mirror failure
		updateOne.mockImplementationOnce(() => { throw new Error('boom'); });
		await ba.transfer('1', '2', 3);
		expect(warn).toHaveBeenCalled();
	});
});
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import BankAccount from '../database/models/bankAccount';
import { UserModel } from '../database/models/userModel';
import * as adapter from '../services/balanceAdapter';

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
	await UserModel.deleteMany({});
});

test('deposit mirrors to UserModel and creates BankAccount via economyService', async () => {
	// deposit into bank which should also mirror to UserModel
	await adapter.deposit('12345', 50);

	const user = await UserModel.findOne({ id: '12345' }).lean();
	expect(user).not.toBeNull();
	expect(user!.balance).toBe(50);

	const acct = await BankAccount.findOne({ userId: '12345' }).lean();
	expect(acct).not.toBeNull();
	expect(acct!.balance).toBe(50);
});

test('debitWallet fails when insufficient funds and succeeds when enough', async () => {
	// create a user with 20 balance
	await UserModel.create({ id: 'u1', username: 'u1', channelId: 'c1', balance: 20 });

	// attempt to debit more than balance
	const fail = await adapter.debitWallet('u1', 30, 'u1', 'c1');
	expect(fail).toBe(false);

	// debit within balance
	const ok = await adapter.debitWallet('u1', 15, 'u1', 'c1');
	expect(ok).toBe(true);

	const user = await UserModel.findOne({ id: 'u1' }).lean();
	expect(user!.balance).toBe(5);
});
