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
