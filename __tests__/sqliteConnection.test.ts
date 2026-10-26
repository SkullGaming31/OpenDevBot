import {
	closeSqliteDatabase,
	getSqliteDatabase,
	openSqliteDatabase,
	withSqliteTransaction,
} from '../src/database/sqliteConnection';

describe('openSqliteDatabase', () => {
	afterEach(() => {
		closeSqliteDatabase();
	});

	it('opens a connection that can execute a query', () => {
		const database = openSqliteDatabase(':memory:');

		expect(database.prepare('SELECT 1 AS connected').get()).toEqual({ connected: 1 });
	});

	it('reuses the active connection until it is closed, then opens a fresh one', () => {
		const firstDatabase = openSqliteDatabase(':memory:');

		expect(openSqliteDatabase(':memory:')).toBe(firstDatabase);

		closeSqliteDatabase();
		expect(firstDatabase.open).toBe(false);
		expect(() => getSqliteDatabase()).toThrow('SQLite database is not connected');

		const reopenedDatabase = openSqliteDatabase(':memory:');
		expect(reopenedDatabase).not.toBe(firstDatabase);
		expect(reopenedDatabase.prepare('SELECT 1 AS connected').get()).toEqual({ connected: 1 });
	});

	it('commits successful transactions and rolls back transactions that throw', () => {
		const database = openSqliteDatabase(':memory:');
		database.exec('CREATE TABLE connection_test (value TEXT)');

		withSqliteTransaction(() => {
			database.prepare('INSERT INTO connection_test (value) VALUES (?)').run('committed');
		});

		expect(database.prepare('SELECT value FROM connection_test').all()).toEqual([
			{ value: 'committed' },
		]);

		expect(() => withSqliteTransaction(() => {
			database.prepare('INSERT INTO connection_test (value) VALUES (?)').run('rolled back');
			throw new Error('abort transaction');
		})).toThrow('abort transaction');

		expect(database.prepare('SELECT value FROM connection_test').all()).toEqual([
			{ value: 'committed' },
		]);
	});
});
