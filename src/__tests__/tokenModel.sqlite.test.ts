import { closeSqliteDatabase, openSqliteDatabase } from '../database/sqliteConnection';
import { TokenModel } from '../database/models/tokenModel';

describe('SQLite token persistence', () => {
	beforeEach(() => {
		closeSqliteDatabase();
		openSqliteDatabase(':memory:');
	});

	afterEach(() => {
		closeSqliteDatabase();
	});

	test('concurrent upserts for one Twitch user preserve the unique token record', async () => {
		await Promise.all([
			TokenModel.findOneAndUpdate(
				{ user_id: '123' },
				{ $set: { login: 'streamer', access_token: 'first-token' } },
				{ upsert: true, returnDocument: 'after' }
			),
			TokenModel.findOneAndUpdate(
				{ user_id: '123' },
				{ $set: { login: 'streamer', access_token: 'second-token' } },
				{ upsert: true, returnDocument: 'after' }
			),
		]);

		expect(await TokenModel.countDocuments({ user_id: '123' })).toBe(1);
		expect(await TokenModel.findOne({ user_id: '123' })).toMatchObject({
			user_id: '123',
			login: 'streamer',
		});
	});

	test('refresh updates preserve the token identity and profile fields', async () => {
		await TokenModel.findOneAndUpdate(
			{ user_id: '123' },
			{ $set: { login: 'streamer', access_token: 'initial-token', broadcaster_type: 'affiliate' } },
			{ upsert: true, returnDocument: 'after' }
		);
		await TokenModel.findOneAndUpdate(
			{ user_id: '123' },
			{ $set: { access_token: 'refreshed-token' } },
			{ upsert: true, returnDocument: 'after' }
		);

		expect(await TokenModel.findOne({ user_id: '123' })).toMatchObject({
			user_id: '123',
			login: 'streamer',
			access_token: 'refreshed-token',
			broadcaster_type: 'affiliate',
		});
		expect(await TokenModel.countDocuments({ user_id: '123' })).toBe(1);
	});
});
