import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
		expect(() => getSqliteDatabase()).toThrow('SQLite database is not connected');

		const reopenedDatabase = openSqliteDatabase(':memory:');
		expect(reopenedDatabase).not.toBe(firstDatabase);
		expect(reopenedDatabase.prepare('SELECT 1 AS connected').get()).toEqual({ connected: 1 });
	});

	it('recognizes a connection closed directly', () => {
		const database = openSqliteDatabase(':memory:');
		database.close();
		expect(() => getSqliteDatabase()).toThrow('SQLite database is not connected');
		expect(openSqliteDatabase(':memory:')).not.toBe(database);
	});

	it('retains existing database contents after reopening the file', () => {
		const path = join(tmpdir(), `opendevbot-sqlite-${randomUUID()}.sqlite`);
		try {
			const database = openSqliteDatabase(path);
			database.exec("CREATE TABLE persisted (value TEXT); INSERT INTO persisted VALUES ('saved')");
			closeSqliteDatabase();
			expect(openSqliteDatabase(path).prepare('SELECT value FROM persisted').get()).toEqual({ value: 'saved' });
		} finally {
			closeSqliteDatabase();
			for (const suffix of ['', '-wal', '-shm']) rmSync(`${path}${suffix}`, { force: true });
		}
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

	it('rolls back a nested transaction without discarding the outer transaction', () => {
		const database = openSqliteDatabase(':memory:');
		database.exec('CREATE TABLE connection_test (value TEXT)');
		withSqliteTransaction(() => {
			database.prepare('INSERT INTO connection_test VALUES (?)').run('outer');
			expect(() => withSqliteTransaction(() => {
				database.prepare('INSERT INTO connection_test VALUES (?)').run('inner');
				throw new Error('inner failure');
			})).toThrow('inner failure');
			database.prepare('INSERT INTO connection_test VALUES (?)').run('after');
		});
		expect(database.prepare('SELECT value FROM connection_test ORDER BY rowid').all()).toEqual([
			{ value: 'outer' }, { value: 'after' },
		]);
	});

	it('rolls back committed nested work if the outer transaction fails', () => {
		const database = openSqliteDatabase(':memory:');
		database.exec('CREATE TABLE connection_test (value TEXT)');
		expect(() => withSqliteTransaction(() => {
			withSqliteTransaction(() => database.prepare('INSERT INTO connection_test VALUES (?)').run('inner'));
			throw new Error('outer failure');
		})).toThrow('outer failure');
		expect(database.prepare('SELECT value FROM connection_test').all()).toEqual([]);
	});
});
