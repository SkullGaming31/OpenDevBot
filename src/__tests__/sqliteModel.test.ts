import { closeSqliteDatabase, getSqliteDatabase, withSqliteTransaction } from '../database/sqliteConnection';
import { createSqliteModel } from '../database/sqliteModel';
import { useInMemorySqliteDatabase } from './sqliteTestSetup';

interface TestDocument {
	key: string;
	count: number;
	score?: number;
	enabled?: boolean;
	profile?: { name: string };
	tags: string[];
	obsolete?: string;
}

const TestModel = createSqliteModel<TestDocument>('sqlite_model_test', {
	defaults: { count: 0, tags: [] },
	timestamps: true,
	unique: [['key']],
});

useInMemorySqliteDatabase();

describe('createSqliteModel', () => {
	test('rolls back a transaction when an operation throws', () => {
		expect(() => withSqliteTransaction(() => {
			TestModel.createSync({ key: 'rolled-back', count: 1 });
			throw new Error('abort transaction');
		})).toThrow('abort transaction');

		expect(TestModel.countDocuments().execSync()).toBe(0);
	});

	test('rolls back a batch insert when a unique constraint fails', async () => {
		await expect(TestModel.create([
			{ key: 'duplicate', count: 1 },
			{ key: 'duplicate', count: 2 },
		])).rejects.toThrow(/Unique constraint failed/);

		expect(await TestModel.countDocuments()).toBe(0);
	});

	test('supports findOneAndUpdate upserts, update operators, and return options', async () => {
		const beforeInsert = await TestModel.findOneAndUpdate(
			{ key: 'first' },
			{ $set: { profile: { name: 'Ada' } }, $setOnInsert: { count: 2 }, $inc: { count: 3 } },
			{ upsert: true },
		);
		expect(beforeInsert).toBeNull();

		const afterInsert = await TestModel.findOneAndUpdate(
			{ key: 'first' },
			{ $inc: { count: 4 }, $unset: { 'profile.name': '' } },
			{ upsert: true, returnDocument: 'after' },
		);
		expect(afterInsert).toMatchObject({ key: 'first', count: 9 });
		expect(afterInsert?.profile?.name).toBeUndefined();

		const beforeUpdate = await TestModel.findOneAndUpdate(
			{ key: 'first' },
			{ $set: { count: 10 } },
		);
		expect(beforeUpdate?.count).toBe(9);
		expect(await TestModel.findOne({ key: 'first' })).toMatchObject({ count: 10 });
	});

	test('supports updateOne upsert results and updateMany with dotted fields', async () => {
		const upsert = await TestModel.updateOne(
			{ key: 'nested.one' },
			{ $set: { 'profile.name': 'Lin' }, $inc: { count: 2 } },
			{ upsert: true },
		);
		expect(upsert).toMatchObject({ matchedCount: 0, upsertedCount: 1 });

		await TestModel.create([
			{ key: 'nested.two', profile: { name: 'Lin' }, score: 10, enabled: true },
			{ key: 'nested.three', profile: { name: 'Lin' }, score: 20, enabled: true },
		]);
		const updated = await TestModel.updateMany(
			{ 'profile.name': 'Lin' },
			{ $inc: { count: 1 }, $set: { enabled: false } },
		);

		expect(updated).toMatchObject({ matchedCount: 3, modifiedCount: 3 });
		expect(await TestModel.countDocuments({ enabled: false })).toBe(3);
	});

	test('applies sort, skip, limit, projection, and nested query filters', async () => {
		await TestModel.create([
			{ key: 'low', score: 10, enabled: true },
			{ key: 'high', score: 30, enabled: true },
			{ key: 'middle', score: 20, enabled: true },
			{ key: 'disabled', score: 40, enabled: false },
		]);

		const results = await TestModel.find({ enabled: true })
			.sort({ score: -1 })
			.skip(1)
			.limit(1)
			.select('key score');

		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ key: 'middle', score: 20 });
		expect(results[0].enabled).toBeUndefined();
	});

	test('exposes the active isolated in-memory connection', () => {
		expect(getSqliteDatabase().prepare('PRAGMA database_list').all()).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'main', file: '' })]),
		);
	});
});

afterAll(() => {
	closeSqliteDatabase();
});
