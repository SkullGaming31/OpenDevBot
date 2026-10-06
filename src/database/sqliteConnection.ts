import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import logger from '../util/logger';

let activeDatabase: Database.Database | null = null;

export function openSqliteDatabase(
	databasePath = process.env.SQLITE_DB_PATH || 'data/opendevbot.sqlite',
): Database.Database {
	try {
		if (activeDatabase?.open) {
			return activeDatabase;
		}

		if (databasePath !== ':memory:') {
			mkdirSync(dirname(resolve(databasePath)), { recursive: true });
		}

		const database = new Database(databasePath);
		database.pragma('journal_mode = WAL');
		activeDatabase = database;
		logger.info('SQLite database connected successfully');
		return database;
	} catch (error) {
		logger.error('SQLite database connection error:', error);
		throw error;
	}
}

export function getSqliteDatabase(): Database.Database {
	if (!activeDatabase?.open) {
		throw new Error('SQLite database is not connected');
	}
	return activeDatabase;
}

export function withSqliteTransaction<T>(operation: () => T): T {
	return getSqliteDatabase().transaction(operation)();
}

export function closeSqliteDatabase(): void {
	if (activeDatabase?.open) {
		activeDatabase.close();
	}
	activeDatabase = null;
}
