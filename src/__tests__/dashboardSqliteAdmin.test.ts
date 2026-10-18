import request from 'supertest';
import axios from 'axios';
import BankAccount from '../database/models/bankAccount';
import { TokenModel } from '../database/models/tokenModel';
import { closeSqliteDatabase, getSqliteDatabase, openSqliteDatabase } from '../database/sqliteConnection';

describe('SQLite dashboard admin endpoints', () => {
	let app: any;
	const token = 'dashboard-test-token';
	const originalClientId = process.env.TWITCH_CLIENT_ID;
	const originalEnableChat = process.env.ENABLE_CHAT;
	const originalEnableEventSub = process.env.ENABLE_EVENTSUB;

	beforeAll(async () => {
		process.env.ADMIN_API_TOKEN = token;
		process.env.TWITCH_CLIENT_ID = 'dashboard-test-client';
		Reflect.deleteProperty(process.env, 'ENABLE_CHAT');
		Reflect.deleteProperty(process.env, 'ENABLE_EVENTSUB');
		openSqliteDatabase(':memory:');
		const createApp = (await import('../util/createApp')).default;
		app = createApp();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	beforeEach(() => {
		getSqliteDatabase().exec(`CREATE TABLE IF NOT EXISTS application_documents (
			collection TEXT NOT NULL,
			id TEXT NOT NULL,
			document TEXT NOT NULL,
			PRIMARY KEY (collection, id)
		)`);
		getSqliteDatabase().prepare('DELETE FROM application_documents').run();
	});

	afterAll(() => {
		closeSqliteDatabase();
		delete process.env.ADMIN_API_TOKEN;
		process.env.TWITCH_CLIENT_ID = originalClientId ?? '';
		if (originalEnableChat === undefined) Reflect.deleteProperty(process.env, 'ENABLE_CHAT');
		else process.env.ENABLE_CHAT = originalEnableChat;
		if (originalEnableEventSub === undefined) Reflect.deleteProperty(process.env, 'ENABLE_EVENTSUB');
		else process.env.ENABLE_EVENTSUB = originalEnableEventSub;
	});

	it('lists paginated economy accounts from SQLite', async () => {
		await BankAccount.create([
			{ userId: 'user-1', balance: { bank: 50, wallet: 5 } },
			{ userId: 'user-2', balance: { bank: 100, wallet: 10 } },
		]);

		const response = await request(app)
			.get('/api/v1/admin/economy/accounts')
			.set('x-admin-token', token)
			.query({ page: '2', limit: '1' });

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({ total: 2, page: 2, limit: 1 });
		expect(response.body.items).toHaveLength(1);
		expect(response.body.items[0].userId).toBeTruthy();
	});

	it('loads, saves, and validates persisted monitor settings', async () => {
		const initial = await request(app)
			.get('/api/v1/admin/settings/monitor')
			.set('x-admin-token', token);
		expect(initial.status).toBe(200);
		expect(initial.body.settings).toBeNull();

		const settings = {
			bitsThreshold: 25,
			totalMax: 400,
			perEventMax: { chat: 150, follow: 75 },
			perEventVisible: { chat: true, follow: false },
		};
		const saved = await request(app)
			.put('/api/v1/admin/settings/monitor')
			.set('x-admin-token', token)
			.send(settings);
		expect(saved.status).toBe(200);
		expect(saved.body.settings).toEqual(settings);

		const loaded = await request(app)
			.get('/api/v1/admin/settings/monitor')
			.set('x-admin-token', token);
		expect(loaded.body.settings).toEqual(settings);

		const invalid = await request(app)
			.put('/api/v1/admin/settings/monitor')
			.set('x-admin-token', token)
			.send({ ...settings, bitsThreshold: -1 });
		expect(invalid.status).toBe(400);
	});

	it('returns persisted streamer and bot identities without exposing token credentials', async () => {
		await TokenModel.create([
			{
				user_id: 'streamer-1',
				login: 'canadiendragon',
				access_token: 'streamer-access-secret',
				refresh_token: 'streamer-refresh-secret',
				scope: ['chat:read'],
				expires_in: 3600,
				obtainmentTimestamp: 200,
				broadcaster_type: 'affiliate',
			},
			{
				user_id: '659523613',
				login: 'opendevbot',
				access_token: 'bot-access-secret',
				refresh_token: 'bot-refresh-secret',
				scope: ['chat:read'],
				expires_in: 3600,
				obtainmentTimestamp: 100,
				broadcaster_type: '',
			},
		]);

		const response = await request(app)
			.get('/api/v1/admin/twitch/accounts')
			.set('x-admin-token', token);

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			streamer: { userId: 'streamer-1', username: 'canadiendragon' },
			bot: { userId: '659523613', username: 'opendevbot' },
		});
		expect(JSON.stringify(response.body)).not.toContain('secret');
	});

	it('protects persisted Twitch signup account identities with admin auth', async () => {
		const response = await request(app).get('/api/v1/admin/twitch/accounts');
		expect(response.status).toBe(401);
	});

	it('signs out locally without revoking Twitch credentials', async () => {
		await TokenModel.create({
			user_id: '123456',
			login: 'canadiendragon',
			access_token: 'streamer-access-secret',
			refresh_token: 'streamer-refresh-secret',
			scope: ['chat:read'],
			expires_in: 3600,
			obtainmentTimestamp: 200,
			broadcaster_type: 'affiliate',
		});
		const revoke = jest.spyOn(axios, 'post');

		const response = await request(app)
			.delete('/api/v1/admin/twitch/accounts/123456')
			.set('x-admin-token', token);

		expect(response.status).toBe(200);
		expect(revoke).not.toHaveBeenCalled();
		expect(await TokenModel.findOne({ user_id: '123456' })).toBeNull();
	});

	it('revokes access and refresh tokens with Twitch before deleting the local account', async () => {
		await TokenModel.create({
			user_id: '123456',
			login: 'canadiendragon',
			access_token: 'streamer-access-secret',
			refresh_token: 'streamer-refresh-secret',
			scope: ['chat:read'],
			expires_in: 3600,
			obtainmentTimestamp: 200,
			broadcaster_type: 'affiliate',
		});
		const revoke = jest.spyOn(axios, 'post').mockResolvedValue({} as never);

		const response = await request(app)
			.post('/api/v1/admin/twitch/accounts/123456/revoke')
			.set('x-admin-token', token);

		expect(response.status).toBe(200);
		expect(revoke).toHaveBeenCalledTimes(2);
		expect(revoke.mock.calls.map(([, body]) => (body as URLSearchParams).get('token'))).toEqual([
			'streamer-access-secret',
			'streamer-refresh-secret',
		]);
		expect(await TokenModel.findOne({ user_id: '123456' })).toBeNull();
	});

	it('keeps the local token when Twitch revocation fails', async () => {
		await TokenModel.create({
			user_id: '123456',
			login: 'canadiendragon',
			access_token: 'streamer-access-secret',
			refresh_token: 'streamer-refresh-secret',
			scope: ['chat:read'],
			expires_in: 3600,
			obtainmentTimestamp: 200,
			broadcaster_type: 'affiliate',
		});
		jest.spyOn(axios, 'post').mockRejectedValue(new Error('Twitch unavailable'));

		const response = await request(app)
			.post('/api/v1/admin/twitch/accounts/123456/revoke')
			.set('x-admin-token', token);

		expect(response.status).toBe(502);
		expect(response.body.error).toContain('local token was kept');
		expect(await TokenModel.findOne({ user_id: '123456' })).not.toBeNull();
	});
});
