import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import BankAccount from '../database/models/bankAccount';
import { deposit, withdraw, transfer, buyItem } from '../services/economyService';
import MarketplaceItem from '../database/models/marketplaceItem';

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

test('deposit and withdraw basic', async () => {
	await deposit('user1', 100);
	const acct = await BankAccount.findOne({ userId: 'user1' });
	expect(acct).not.toBeNull();
	expect(acct!.balance).toBe(100);

	await withdraw('user1', 40);
	const acct2 = await BankAccount.findOne({ userId: 'user1' });
	expect(acct2!.balance).toBe(60);
});

test('transfer succeeds and is atomic', async () => {
	await deposit('a', 200);
	await deposit('b', 50);
	await transfer('a', 'b', 120);
	const a = await BankAccount.findOne({ userId: 'a' });
	const b = await BankAccount.findOne({ userId: 'b' });
	expect(a!.balance).toBe(80);
	expect(b!.balance).toBe(170);
});

test('buy item marketplace flow', async () => {
	// seller posts item
	const item = new MarketplaceItem({ itemId: 'item1', sellerId: 'seller1', price: 30 });
	await item.save();
	await deposit('buyer1', 100);
	const res = await buyItem('buyer1', 'item1');
	expect(res.success).toBe(true);
	const buyer = await BankAccount.findOne({ userId: 'buyer1' });
	const seller = await BankAccount.findOne({ userId: 'seller1' });
	expect(buyer!.balance).toBe(70);
	expect(seller!.balance).toBe(30);
});
