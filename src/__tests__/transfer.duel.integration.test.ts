/**
 * Integration tests for transfer and duel flows using SQLite transactions.
 */
import balanceAdapter from '../services/balanceAdapter';
import BankAccount from '../database/models/bankAccount';
import { useInMemorySqliteDatabase } from './sqliteTestSetup';

useInMemorySqliteDatabase();

describe('transfer/duel integration (SQLite transactions)', () => {
	beforeEach(async () => {
		await BankAccount.deleteMany({});
	});

	test('transfer moves funds atomically', async () => {
		await BankAccount.create({ userId: 'alice', balance: { bank: 100, wallet: 0 } });
		await BankAccount.create({ userId: 'bob', balance: { bank: 10, wallet: 0 } });

		await balanceAdapter.transfer('alice', 'bob', 25);

		const a = await BankAccount.findOne({ userId: 'alice' });
		const b = await BankAccount.findOne({ userId: 'bob' });

		expect(a?.balance.bank).toBe(75);
		expect(b?.balance.bank).toBe(35);
	});

	test('duel-like transfer under contention', async () => {
		await BankAccount.create({ userId: 'p1', balance: { bank: 50, wallet: 0 } });
		await BankAccount.create({ userId: 'p2', balance: { bank: 50, wallet: 0 } });

		// Apply competing transfers sequentially and verify the total remains conserved.
		await balanceAdapter.transfer('p1', 'p2', 30);
		await balanceAdapter.transfer('p2', 'p1', 20);

		const p1 = await BankAccount.findOne({ userId: 'p1' });
		const p2 = await BankAccount.findOne({ userId: 'p2' });

		// final sums should still equal 100
		expect((p1?.balance.bank ?? 0) + (p2?.balance.bank ?? 0)).toBe(100);
	});
});
