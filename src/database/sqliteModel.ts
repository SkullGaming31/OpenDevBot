import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { getSqliteDatabase } from './sqliteConnection';

type Filter = Record<string, unknown>;
type Update = Record<string, unknown>;
type Projection = string | Record<string, unknown> | undefined;
type StoredDocument = Record<string, unknown> & { _id: string };
interface QueryConfiguration {
	sort: Record<string, unknown> | undefined;
	skip: number;
	limit: number | undefined;
	projection: Projection;
}
interface ModelOptions<T> {
	defaults?: Partial<T>;
	timestamps?: boolean;
	unique?: Array<Array<keyof T & string>>;
}

export interface UpdateResult {
	acknowledged: boolean;
	matchedCount: number;
	modifiedCount: number;
	deletedCount: number;
	upsertedCount: number;
	upsertedId: string | null;
	n: number;
	nModified: number;
}

export interface QueryOptions {
	upsert?: boolean;
	returnDocument?: 'before' | 'after';
	new?: boolean;
}

export type SqliteRecord<T> = T & {
	_id: string;
	createdAt?: Date;
	updatedAt?: Date;
	save(options?: object): Promise<SqliteRecord<T>>;
	deleteOne(options?: object): Promise<UpdateResult>;
	toObject(): T & { _id: string };
};

export class SQLiteQuery<TResult> implements PromiseLike<TResult> {
	private sortValue?: Record<string, unknown>;
	private skipValue = 0;
	private limitValue?: number;
	private projectionValue?: Projection;

	constructor(private readonly executeQuery: (query: SQLiteQuery<TResult>) => TResult) {}

	lean(): this {
		return this;
	}

	sort(value: Record<string, unknown>): this {
		this.sortValue = value;
		return this;
	}

	skip(value: number): this {
		this.skipValue = value;
		return this;
	}

	limit(value: number): this {
		this.limitValue = value;
		return this;
	}

	select(value: Projection): this {
		this.projectionValue = value;
		return this;
	}

	session(_value: unknown): this {
		return this;
	}

	get options(): QueryConfiguration {
		return {
			sort: this.sortValue,
			skip: this.skipValue,
			limit: this.limitValue,
			projection: this.projectionValue,
		};
	}

	exec(): Promise<TResult> {
		return Promise.resolve(this.executeQuery(this));
	}

	execSync(): TResult {
		return this.executeQuery(this);
	}

	then<TResult1 = TResult, TResult2 = never>(
		onfulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.exec().then(onfulfilled, onrejected);
	}
}

export interface SqliteModel<T> {
	new(data?: Partial<T>): SqliteRecord<T>;
	find<R = T>(filter?: Filter, projection?: Projection): SQLiteQuery<SqliteRecord<R>[]>;
	findOne<R = T>(filter?: Filter, projection?: Projection): SQLiteQuery<SqliteRecord<R> | null>;
	findById(id: unknown): SQLiteQuery<SqliteRecord<T> | null>;
	findOneAndUpdate(filter: Filter, update: Update, options?: QueryOptions | object): SQLiteQuery<SqliteRecord<T> | null>;
	findByIdAndUpdate(id: unknown, update: Update, options?: QueryOptions | object): SQLiteQuery<SqliteRecord<T> | null>;
	findOneAndDelete(filter: Filter): SQLiteQuery<SqliteRecord<T> | null>;
	findOneAndDeleteSync(filter: Filter): SqliteRecord<T> | null;
	findByIdAndDelete(id: unknown): SQLiteQuery<SqliteRecord<T> | null>;
	create(data: Partial<T>, options?: object): Promise<SqliteRecord<T>>;
	create(data: Array<Partial<T>>, options?: object): Promise<SqliteRecord<T>[]>;
	createSync(data: Partial<T>): SqliteRecord<T>;
	createSync(data: Array<Partial<T>>): SqliteRecord<T>[];
	updateOne(filter: Filter, update: Update, options?: QueryOptions | object): SQLiteQuery<UpdateResult>;
	updateMany(filter: Filter, update: Update, options?: QueryOptions | object): SQLiteQuery<UpdateResult>;
	insertMany(data: Array<Partial<T>>, options?: object): Promise<SqliteRecord<T>[]>;
	deleteOne(filter: Filter): Promise<UpdateResult>;
	deleteMany(filter: Filter): Promise<UpdateResult>;
	replaceOne(filter: Filter, replacement: Partial<T>, options?: QueryOptions | object): Promise<UpdateResult>;
	countDocuments(filter?: Filter): SQLiteQuery<number>;
}

function encode(value: unknown): unknown {
	if (value instanceof Date) return { __sqliteDate: value.toISOString() };
	if (Array.isArray(value)) return value.map(encode);
	if (value && typeof value === 'object' && !(value instanceof RegExp)) {
		return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)]));
	}
	return value;
}

function decode(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(decode);
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		if (typeof record.__sqliteDate === 'string' && Object.keys(record).length === 1) {
			return new Date(record.__sqliteDate);
		}
		return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, decode(child)]));
	}
	return value;
}

function getPath(source: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((current, key) => {
		if (Array.isArray(current)) return current.map(item => (item as Record<string, unknown> | null)?.[key]);
		if (current && typeof current === 'object') return (current as Record<string, unknown>)[key];
		return undefined;
	}, source);
}

function setPath(source: StoredDocument, path: string, value: unknown): void {
	const parts = path.split('.');
	let current: Record<string, unknown> = source;
	for (const key of parts.slice(0, -1)) {
		const existing = current[key];
		if (!existing || typeof existing !== 'object' || Array.isArray(existing)) current[key] = {};
		current = current[key] as Record<string, unknown>;
	}
	current[parts[parts.length - 1]] = value;
}

function unsetPath(source: StoredDocument, path: string): void {
	const parts = path.split('.');
	const parent = getPath(source, parts.slice(0, -1).join('.')) as Record<string, unknown> | undefined;
	if (parent) delete parent[parts[parts.length - 1]];
}

function comparable(value: unknown): unknown {
	return value instanceof Date ? value.getTime() : value;
}

function valueMatches(actual: unknown, condition: unknown): boolean {
	if (condition instanceof RegExp) return typeof actual === 'string' && condition.test(actual);
	if (condition && typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date)) {
		const operators = condition as Record<string, unknown>;
		return Object.entries(operators).every(([operator, expected]) => {
			const left = comparable(actual);
			const right = comparable(expected);
			switch (operator) {
				case '$eq': return valueMatches(actual, expected);
				case '$ne': return !valueMatches(actual, expected);
				case '$in': return Array.isArray(expected) && expected.some(value => valueMatches(actual, value));
				case '$nin': return Array.isArray(expected) && !expected.some(value => valueMatches(actual, value));
				case '$gte': return (left as number | string) >= (right as number | string);
				case '$gt': return (left as number | string) > (right as number | string);
				case '$lte': return (left as number | string) <= (right as number | string);
				case '$lt': return (left as number | string) < (right as number | string);
				case '$exists': return expected ? actual !== undefined : actual === undefined;
				case '$size': return Array.isArray(actual) && actual.length === expected;
				case '$regex': {
					const regex = expected instanceof RegExp ? expected : new RegExp(String(expected), String(operators.$options || ''));
					return typeof actual === 'string' && regex.test(actual);
				}
				default: return false;
			}
		});
	}
	if (Array.isArray(actual)) return actual.some(value => valueMatches(value, condition));
	if (actual instanceof Date || condition instanceof Date) return comparable(actual) === comparable(condition);
	if (actual && condition && typeof actual === 'object' && typeof condition === 'object') {
		return JSON.stringify(encode(actual)) === JSON.stringify(encode(condition));
	}
	return actual === condition;
}

function matches(document: StoredDocument, filter: Filter): boolean {
	return Object.entries(filter).every(([key, expected]) => {
		if (key === '$or') return Array.isArray(expected) && expected.some(item => matches(document, item as Filter));
		if (key === '$and') return Array.isArray(expected) && expected.every(item => matches(document, item as Filter));
		if (key === '$nor') return Array.isArray(expected) && !expected.some(item => matches(document, item as Filter));
		return valueMatches(getPath(document, key), expected);
	});
}

function applyUpdate(document: StoredDocument, update: Update): StoredDocument {
	const isOperatorUpdate = Object.keys(update).some(key => key.startsWith('$'));
	if (!isOperatorUpdate) {
		return { ...update, _id: document._id } as StoredDocument;
	}
	for (const [path, value] of Object.entries((update.$set || {}) as Update)) setPath(document, path, value);
	for (const [path, value] of Object.entries((update.$setOnInsert || {}) as Update)) {
		if (getPath(document, path) === undefined) setPath(document, path, value);
	}
	for (const [path, value] of Object.entries((update.$inc || {}) as Update)) {
		setPath(document, path, Number(getPath(document, path) || 0) + Number(value));
	}
	for (const path of Object.keys((update.$unset || {}) as Update)) unsetPath(document, path);
	for (const [path, value] of Object.entries((update.$pull || {}) as Update)) {
		const array = getPath(document, path);
		if (Array.isArray(array)) {
			const filtered = array.filter(item => {
				if (value && typeof value === 'object' && !Array.isArray(value)) return !matches(item as StoredDocument, value as Filter);
				return !valueMatches(item, value);
			});
			setPath(document, path, filtered);
		}
	}
	return document;
}

function project<T>(document: StoredDocument, projection?: Projection): T {
	if (!projection) return document as T;
	const fields = typeof projection === 'string'
		? projection.split(/\s+/).filter(Boolean)
		: Object.entries(projection).filter(([, include]) => Boolean(include)).map(([key]) => key);
	const excluded = typeof projection === 'string' || !projection
		? []
		: Object.entries(projection).filter(([, include]) => !include).map(([key]) => key);
	if (excluded.length) {
		const result = { ...document };
		for (const key of excluded) delete result[key];
		return result as T;
	}
	const result: StoredDocument = { _id: document._id };
	for (const key of fields) {
		const value = getPath(document, key);
		if (value !== undefined) setPath(result, key, value);
	}
	return result as T;
}

export function createSqliteModel<T extends object>(collection: string, options: ModelOptions<T> = {}): SqliteModel<T> {
	const db = (): Database.Database => getSqliteDatabase();
	const ensureTable = () => {
		db().exec(`CREATE TABLE IF NOT EXISTS application_documents (
			collection TEXT NOT NULL,
			id TEXT NOT NULL,
			document TEXT NOT NULL,
			PRIMARY KEY (collection, id)
		)`);
		db().exec('CREATE INDEX IF NOT EXISTS idx_application_documents_collection ON application_documents(collection)');
	};
	const readAll = (): StoredDocument[] => {
		ensureTable();
		const rows = db().prepare('SELECT document FROM application_documents WHERE collection = ?').all(collection) as Array<{ document: string }>;
		return rows.map(row => decode(JSON.parse(row.document)) as StoredDocument);
	};
	const write = (document: StoredDocument, inserting = false): void => {
		ensureTable();
		for (const fields of options.unique || []) {
			const conflict = readAll().find(other =>
				other._id !== document._id && fields.every(field => valueMatches(getPath(other, field), getPath(document, field)))
			);
			if (conflict) throw new Error(`Unique constraint failed for ${collection}.${fields.join('+')}`);
		}
		if (options.timestamps) {
			const now = new Date();
			if (inserting && !document.createdAt) document.createdAt = now;
			document.updatedAt = now;
		}
		db().prepare(`INSERT INTO application_documents (collection, id, document) VALUES (?, ?, ?)
			ON CONFLICT(collection, id) DO UPDATE SET document = excluded.document`)
			.run(collection, document._id, JSON.stringify(encode(document)));
	};
	const remove = (document: StoredDocument): void => {
		db().prepare('DELETE FROM application_documents WHERE collection = ? AND id = ?').run(collection, document._id);
	};
	const hydrate = (value: Partial<T>): SqliteRecord<T> => {
		const instance = Object.assign(new Model(value), value) as SqliteRecord<T>;
		return instance;
	};
	const sortAndProject = <R>(rows: StoredDocument[], config: QueryConfiguration): R[] => {
		if (config.sort) {
			const entries = Object.entries(config.sort);
			rows.sort((left, right) => {
				for (const [path, direction] of entries) {
					const a = comparable(getPath(left, path));
					const b = comparable(getPath(right, path));
					if (a === b) continue;
					return (a as number | string) < (b as number | string) ? (Number(direction) < 0 ? 1 : -1) : (Number(direction) < 0 ? -1 : 1);
				}
				return 0;
			});
		}
		if (config.skip) rows = rows.slice(config.skip);
		if (config.limit !== undefined) rows = rows.slice(0, config.limit);
		return rows.map(row => hydrate(project<Partial<T>>(row, config.projection)) as R);
	};

	class Model extends (class {
		constructor(data: Partial<T> = {}) {
			Object.assign(this, options.defaults || {}, data);
			const self = this as unknown as StoredDocument;
			self._id = String(self._id || randomUUID());
			if (options.timestamps && !self.createdAt) self.createdAt = new Date();
		}
	}) {
		async save(): Promise<SqliteRecord<T>> {
			write(this as unknown as StoredDocument, true);
			return this as unknown as SqliteRecord<T>;
		}

		async deleteOne(): Promise<UpdateResult> {
			remove(this as unknown as StoredDocument);
			return result(1, 1, 1);
		}

		toObject(): T & { _id: string } {
			return { ...(this as unknown as T), _id: String((this as unknown as StoredDocument)._id) };
		}
	}

	const result = (matchedCount = 0, modifiedCount = 0, deletedCount = 0, upsertedId: string | null = null): UpdateResult => ({
		acknowledged: true, matchedCount, modifiedCount, deletedCount, upsertedCount: upsertedId ? 1 : 0, upsertedId,
		n: matchedCount, nModified: modifiedCount,
	});

	const findDocuments = (filter: Filter = {}): StoredDocument[] => readAll().filter(document => matches(document, filter));
	const query = <R>(run: (query: SQLiteQuery<R>) => R): SQLiteQuery<R> => new SQLiteQuery(run);
	const find = ((filter: Filter = {}, projection?: Projection) => {
		const q = query<SqliteRecord<T>[]>(query => sortAndProject(findDocuments(filter), query.options));
		if (projection) q.select(projection);
		return q;
	}) as SqliteModel<T>['find'];
	const findOne = ((filter: Filter = {}, projection?: Projection) => {
		const q = query<SqliteRecord<T> | null>(query => sortAndProject<SqliteRecord<T>>(
			findDocuments(filter).slice(0, 1), query.options
		)[0] || null);
		if (projection) q.select(projection);
		return q;
	}) as SqliteModel<T>['findOne'];
	const findOneAndUpdate = (filter: Filter, update: Update, opts: QueryOptions | object = {}) => query<SqliteRecord<T> | null>(() => {
		const config = opts as QueryOptions;
		const transaction = db().transaction(() => {
			const existing = findDocuments(filter)[0];
			if (!existing && config.upsert) {
				const seed = Object.fromEntries(Object.entries(filter).filter(([, value]) => !String(value).startsWith('$')));
				const inserted = applyUpdate({ ...seed, _id: randomUUID() } as StoredDocument, update);
				write(inserted, true);
				return config.returnDocument === 'after' || config.new ? hydrate(inserted as Partial<T>) : null;
			}
			if (!existing) return null;
			const before = { ...existing };
			const updated = applyUpdate(existing, update);
			write(updated);
			return hydrate((config.returnDocument === 'after' || config.new ? updated : before) as Partial<T>);
		});
		return transaction();
	});
	const findByIdAndUpdate = (id: unknown, update: Update, opts?: QueryOptions | object) => findOneAndUpdate({ _id: String(id) }, update, opts);
	const findOneAndDelete = (filter: Filter) => query<SqliteRecord<T> | null>(() => {
		const doc = findDocuments(filter)[0];
		if (!doc) return null;
		remove(doc);
		return hydrate(doc as Partial<T>);
	});
	const findOneAndDeleteSync = (filter: Filter) => findOneAndDelete(filter).execSync();
	const findByIdAndDelete = (id: unknown) => findOneAndDelete({ _id: String(id) });
	const updateOne = (filter: Filter, update: Update, opts: QueryOptions | object = {}) => query<UpdateResult>(() => {
		const config = opts as QueryOptions;
		const transaction = db().transaction(() => {
			const existing = findDocuments(filter)[0];
			if (existing) {
				write(applyUpdate(existing, update));
				return result(1, 1);
			}
			if (config.upsert) {
				const seed: StoredDocument = { _id: randomUUID() };
				for (const [key, value] of Object.entries(filter)) {
					if (!key.startsWith('$') && (!value || typeof value !== 'object' || value instanceof Date || value instanceof RegExp)) {
						setPath(seed, key, value);
					}
				}
				write(applyUpdate(seed, update), true);
				return result(0, 0, 0, seed._id);
			}
			return result();
		});
		return transaction();
	});
	const updateMany = (filter: Filter, update: Update) => query<UpdateResult>(() => {
		const transaction = db().transaction(() => {
			const docs = findDocuments(filter);
			for (const doc of docs) write(applyUpdate(doc, update));
			return result(docs.length, docs.length);
		});
		return transaction();
	});
	const deleteMany = async (filter: Filter = {}): Promise<UpdateResult> => {
		const docs = findDocuments(filter);
		for (const doc of docs) remove(doc);
		return result(docs.length, 0, docs.length);
	};
	const deleteOne = async (filter: Filter): Promise<UpdateResult> => {
		const doc = findDocuments(filter)[0];
		if (!doc) return result();
		remove(doc);
		return result(1, 0, 1);
	};
	const createSync = (data: Partial<T> | Array<Partial<T>>): SqliteRecord<T> | SqliteRecord<T>[] => {
		if (Array.isArray(data)) {
			const transaction = db().transaction(() => data.map(value => {
				const instance = hydrate(value);
				write(instance as unknown as StoredDocument, true);
				return instance;
			}));
			return transaction();
		}
		const instance = hydrate(data);
		write(instance as unknown as StoredDocument, true);
		return instance;
	};
	const create = async (data: Partial<T> | Array<Partial<T>>): Promise<SqliteRecord<T> | SqliteRecord<T>[]> => createSync(data);
	const insertMany = async (data: Array<Partial<T>>): Promise<SqliteRecord<T>[]> => {
		const inserted = await create(data);
		return inserted as SqliteRecord<T>[];
	};
	const replaceOne = async (filter: Filter, replacement: Partial<T>, opts: QueryOptions = {}): Promise<UpdateResult> => {
		const found = findDocuments(filter)[0];
		if (found) {
			write({ ...replacement, _id: found._id } as StoredDocument);
			return result(1, 1);
		}
		if (opts.upsert) {
			const created = hydrate(replacement);
			write(created as unknown as StoredDocument, true);
			return result(0, 0, 0, created._id);
		}
		return result();
	};
	const findById = (id: unknown) => findOne({ _id: String(id) });
	const countDocuments = (filter: Filter = {}) => query<number>(() => findDocuments(filter).length);

	return Object.assign(Model, {
		find, findOne, findById, findOneAndUpdate, findByIdAndUpdate, findOneAndDelete, findOneAndDeleteSync, findByIdAndDelete,
		create, createSync, insertMany, updateOne, updateMany, deleteOne, deleteMany, replaceOne, countDocuments,
	}) as unknown as SqliteModel<T>;
}
