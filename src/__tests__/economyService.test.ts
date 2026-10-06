import BankAccount from '../database/models/bankAccount';
import MarketplaceItem from '../database/models/marketplaceItem';
import TransactionLog from '../database/models/transactionLog';
import { closeSqliteDatabase, getSqliteDatabase, openSqliteDatabase } from '../database/sqliteConnection';
import {
	buyItem,
	deposit,
	EconomyError,
	getOrCreateAccount,
	transfer,
	withdraw,
} from '../services/economyService';

describe('economyService', () => {
	beforeAll(() => {
		openSqliteDatabase(':memory:');
	});

	beforeEach(() => {
		const db = getSqliteDatabase();
		db.exec(`CREATE TABLE IF NOT EXISTS application_documents (
			collection TEXT NOT NULL,
			id TEXT NOT NULL,
			document TEXT NOT NULL,
			PRIMARY KEY (collection, id)
		)`);
		db.prepare('DELETE FROM application_documents').run();
	});

	afterAll(() => {
		closeSqliteDatabase();
	});

	test('getOrCreateAccount initializes and reuses the account', async () => {
		const first = await getOrCreateAccount('user-1');
		const second = await getOrCreateAccount('user-1');

		expect(first.balance).toEqual({ bank: 0, wallet: 0 });
		expect(second._id).toBe(first._id);
	});

	test('deposit validates the amount, updates balance, and records metadata', async () => {
		await expect(deposit('user-1', 0)).rejects.toBeInstanceOf(EconomyError);
		const account = await deposit('user-1', 50, { reason: 'test' });
		const log = await TransactionLog.findOne({ type: 'deposit' });

		expect(account.balance).toEqual({ bank: 50, wallet: 0 });
		expect(log?.to).toBe('user-1');
		expect(log?.meta).toEqual({ reason: 'test' });
	});

	test('withdraw rejects insufficient funds and debits a funded account', async () => {
		await BankAccount.create({ userId: 'user-1', balance: { bank: 20, wallet: 0 } });

		await expect(withdraw('user-1', 30)).rejects.toThrow('Insufficient funds');
		const account = await withdraw('user-1', 5);

		expect(account.balance).toEqual({ bank: 15, wallet: 0 });
	});

	test('transfer debits and credits accounts atomically', async () => {
		await BankAccount.create([
			{ userId: 'sender', balance: { bank: 40, wallet: 0 } },
			{ userId: 'recipient', balance: { bank: 5, wallet: 0 } },
		]);

		await expect(transfer('sender', 'recipient', 50)).rejects.toThrow('Insufficient funds');
		expect((await BankAccount.findOne({ userId: 'sender' }))?.balance.bank).toBe(40);

		await transfer('sender', 'recipient', 10, { reason: 'gift' });

		expect((await BankAccount.findOne({ userId: 'sender' }))?.balance.bank).toBe(30);
		expect((await BankAccount.findOne({ userId: 'recipient' }))?.balance.bank).toBe(15);
		expect(await TransactionLog.countDocuments({ type: 'transfer' })).toBe(1);
		await expect(transfer('sender', 'recipient', 0)).rejects.toBeInstanceOf(EconomyError);
	});

	test('buyItem transfers payment, removes the listing, and records the purchase', async () => {
		await BankAccount.create([
			{ userId: 'buyer', balance: { bank: 25, wallet: 0 } },
			{ userId: 'seller', balance: { bank: 0, wallet: 0 } },
		]);
		await MarketplaceItem.create({ itemId: 'item-1', sellerId: 'seller', price: 10 });

		await expect(buyItem('buyer', 'missing')).rejects.toThrow('Item not found');
		await expect(buyItem('buyer', 'item-1')).resolves.toEqual({ success: true });

		expect((await BankAccount.findOne({ userId: 'buyer' }))?.balance.bank).toBe(15);
		expect((await BankAccount.findOne({ userId: 'seller' }))?.balance.bank).toBe(10);
		expect(await MarketplaceItem.findOne({ itemId: 'item-1' })).toBeNull();
		expect(await TransactionLog.countDocuments({ type: 'purchase' })).toBe(1);
	});
});
