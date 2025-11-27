import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import BankAccount from '../database/models/bankAccount';
import MarketplaceItem from '../database/models/marketplaceItem';
import { deposit, withdraw, transfer, buyItem } from '../services/economyService';

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
	await MarketplaceItem.deleteMany({});
});

test('deposit rejects non-positive amounts', async () => {
	await expect(deposit('u1', 0)).rejects.toThrow(/Amount must be positive/);
	await expect(deposit('u1', -10)).rejects.toThrow(/Amount must be positive/);
});

test('withdraw rejects non-positive and insufficient funds', async () => {
	await expect(withdraw('u1', 0)).rejects.toThrow(/Amount must be positive/);
	await deposit('u1', 20);
	await expect(withdraw('u1', 30)).rejects.toThrow(/Insufficient funds/);
});

test('transfer rejects non-positive and fails when sender lacks funds', async () => {
	await expect(transfer('a', 'b', 0)).rejects.toThrow(/Amount must be positive/);
	await deposit('a', 10);
	await expect(transfer('a', 'b', 20)).rejects.toThrow(/Insufficient funds/);
});

test('buyItem errors for missing item and insufficient funds', async () => {
	await expect(buyItem('buyer', 'nonexistent')).rejects.toThrow(/Item not found/);

	const item = new MarketplaceItem({ itemId: 'i1', sellerId: 's1', price: 100 });
	await item.save();
	await deposit('buyer', 30);
	await expect(buyItem('buyer', 'i1')).rejects.toThrow(/Insufficient funds/);
});
