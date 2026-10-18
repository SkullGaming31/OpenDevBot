import { afterEach, beforeEach } from '@jest/globals';

function sqliteConnection(): typeof import('../database/sqliteConnection') {
	return require('../database/sqliteConnection') as typeof import('../database/sqliteConnection');
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
