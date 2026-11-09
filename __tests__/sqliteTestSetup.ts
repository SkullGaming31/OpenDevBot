import { afterEach, beforeEach } from '@jest/globals';

function sqliteConnection(): typeof import('../src/database/sqliteConnection') {
	return require('../src/database/sqliteConnection') as typeof import('../src/database/sqliteConnection');
}

export function useInMemorySqliteDatabase(): void {
	beforeEach(() => {
		const sqlite = sqliteConnection();
		sqlite.closeSqliteDatabase();
		sqlite.openSqliteDatabase(':memory:');
	});

	afterEach(() => {
		sqliteConnection().closeSqliteDatabase();
	});
}
