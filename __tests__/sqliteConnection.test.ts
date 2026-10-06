import { openSqliteDatabase } from '../src/database/sqliteConnection';

describe('openSqliteDatabase', () => {
	let database: ReturnType<typeof openSqliteDatabase>;

	afterEach(() => {
		if (database?.open) database.close();
	});

	it('opens a connection that can execute a query', () => {
		database = openSqliteDatabase(':memory:');

		expect(database.prepare('SELECT 1 AS connected').get()).toEqual({ connected: 1 });
	});
});
