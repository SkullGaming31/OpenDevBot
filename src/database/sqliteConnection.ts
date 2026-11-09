import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import logger from '../util/logger';

let activeDatabase: DatabaseSync | null = null;
let savepointId = 0;

class ApplicationDatabase extends DatabaseSync {
	close(): void {
		super.close();
		if (activeDatabase === this) activeDatabase = null;
	}
}

export function openSqliteDatabase(
	databasePath = process.env.SQLITE_DB_PATH || 'data/opendevbot.sqlite',
): DatabaseSync {
	try {
		if (activeDatabase) {
			return activeDatabase;
		}

		if (databasePath !== ':memory:') {
			mkdirSync(dirname(resolve(databasePath)), { recursive: true });
		}

		const database = new ApplicationDatabase(databasePath);
		try {
			database.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL');
		} catch (error) {
			database.close();
			throw error;
		}
		activeDatabase = database;
		logger.info('SQLite database connected successfully');
		return database;
	} catch (error) {
		logger.error('SQLite database connection error:', error);
		throw error;
	}
}

export function getSqliteDatabase(): DatabaseSync {
	if (!activeDatabase) {
		throw new Error('SQLite database is not connected');
	}
	return activeDatabase;
}

export function withSqliteTransaction<T>(operation: () => T): T {
	const database = getSqliteDatabase();
	const savepoint = `opendevbot_${++savepointId}`;
	database.exec(`SAVEPOINT ${savepoint}`);
	try {
		const result = operation();
		database.exec(`RELEASE SAVEPOINT ${savepoint}`);
		return result;
	} catch (error) {
		try {
			database.exec(`ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}`);
		} catch (rollbackError) {
			logger.error('SQLite transaction rollback failed:', rollbackError);
		}
		throw error;
	}
}

export function closeSqliteDatabase(): void {
	if (activeDatabase) {
		activeDatabase.close();
	}
	activeDatabase = null;
}
