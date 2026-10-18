import MarketplaceItem from '../database/models/marketplaceItem';
import { closeSqliteDatabase, getSqliteDatabase, openSqliteDatabase } from '../database/sqliteConnection';
import { listMarketplace } from '../services/economyService';

describe('economyService marketplace listing', () => {
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

	test('lists marketplace items from SQLite', async () => {
		await MarketplaceItem.create([
			{ itemId: 'item-1', sellerId: 'seller-1', price: 10 },
			{ itemId: 'item-2', sellerId: 'seller-2', price: 20 },
		]);

		await expect(listMarketplace()).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ itemId: 'item-1', price: 10 }),
				expect.objectContaining({ itemId: 'item-2', price: 20 }),
			]),
		);
	});
});
