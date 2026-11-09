import request from 'supertest';
import axios from 'axios';
import path from 'path';
import BankAccount from '../src/database/models/bankAccount';
import { TokenModel } from '../src/database/models/tokenModel';
import { UserModel } from '../src/database/models/userModel';
import { closeSqliteDatabase, getSqliteDatabase, openSqliteDatabase } from '../src/database/sqliteConnection';

const mockGetUsersByIds = jest.fn();
const mockGetUserApi = jest.fn(async () => ({ users: { getUsersByIds: mockGetUsersByIds } }));
const mockRestartChat = jest.fn();
const mockStopChat = jest.fn();
const mockRecreateEventSubs = jest.fn();
const mockGetChatClient = jest.fn();
const mockJoinChannel = jest.fn();
jest.mock('../src/chat', () => ({
	restartChat: mockRestartChat, stopChat: mockStopChat,
	getChatClient: mockGetChatClient, joinChannel: mockJoinChannel,
}));
jest.mock('../src/EventSubEvents', () => ({ recreateEventSubs: mockRecreateEventSubs }));
jest.mock('../src/api/userApiClient', () => ({ getUserApi: mockGetUserApi }));

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
		const createApp = (await import('../src/util/createApp')).default;
		app = createApp();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	beforeEach(() => {
		mockGetUsersByIds.mockReset().mockResolvedValue([]);
		mockGetUserApi.mockClear();
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

	it('shows stored, locally known, and Twitch-resolved names while keeping IDs for account actions', async () => {
		await BankAccount.create([
			{ userId: '101', username: 'SavedName', balance: { bank: 1, wallet: 0 } },
			{ userId: '102', username: '102', balance: { bank: 2, wallet: 0 } },
			{ userId: '103', balance: { bank: 3, wallet: 0 } },
			{ userId: '104', balance: { bank: 4, wallet: 0 } },
		]);
		await UserModel.create({ id: '102', username: 'LocalName', channelId: 'channel' });
		mockGetUsersByIds.mockResolvedValue([{ id: '103', displayName: 'TwitchName' }]);

		const response = await request(app).get('/api/v1/admin/economy/accounts').set('x-admin-token', token);
		expect(response.status).toBe(200);
		expect(response.body.items).toEqual(expect.arrayContaining([
			expect.objectContaining({ userId: '101', displayName: 'SavedName' }),
			expect.objectContaining({ userId: '102', displayName: 'LocalName' }),
			expect.objectContaining({ userId: '103', displayName: 'TwitchName' }),
			expect.objectContaining({ userId: '104', displayName: '104' }),
		]));
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(1);
		expect(mockGetUsersByIds.mock.calls[0][0]).toEqual(expect.arrayContaining(['101', '102', '103', '104']));
		expect(mockGetUsersByIds.mock.calls[0][0]).toHaveLength(4);

		const update = await request(app).put('/api/v1/admin/economy/account/103')
			.set('x-admin-token', token).send({ bank: 12, wallet: 4 });
		expect(update.status).toBe(200);
		expect((await BankAccount.findOne({ userId: '103' }))?.balance).toEqual({ bank: 12, wallet: 4 });
		const remove = await request(app).delete('/api/v1/admin/economy/account/103').set('x-admin-token', token);
		expect(remove.status).toBe(200);
		expect(await BankAccount.findOne({ userId: '103' })).toBeNull();
	});

	it('caches resolved Twitch names and leaves persisted accounts unchanged', async () => {
		await BankAccount.create({ userId: '201', balance: { bank: 10, wallet: 1 } });
		mockGetUsersByIds.mockResolvedValue([{ id: '201', displayName: 'Viewer' }]);
		for (let i = 0; i < 2; i++) {
			const response = await request(app).get('/api/v1/admin/economy/accounts').set('x-admin-token', token);
			expect(response.body.items[0]).toMatchObject({ userId: '201', displayName: 'Viewer' });
		}
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(1);
		expect((await BankAccount.findOne({ userId: '201' }))?.username).toBeUndefined();
	});

	it('falls back to the ID if Twitch lookup fails and retries on a later request', async () => {
		await BankAccount.create({ userId: '301', balance: { bank: 0, wallet: 0 } });
		mockGetUsersByIds.mockRejectedValueOnce(new Error('Twitch unavailable'))
			.mockResolvedValueOnce([{ id: '301', displayName: 'Recovered' }]);
		const first = await request(app).get('/api/v1/admin/economy/accounts').set('x-admin-token', token);
		expect(first.status).toBe(200);
		expect(first.body.items[0].displayName).toBe('301');
		const second = await request(app).get('/api/v1/admin/economy/accounts').set('x-admin-token', token);
		expect(second.body.items[0].displayName).toBe('Recovered');
	});

	it('refreshes renamed users after the cache expires and falls back to saved names', async () => {
		const account = await BankAccount.create({ userId: '401', username: 'OldName', balance: { bank: 10, wallet: 0 } });
		await UserModel.create({ id: '401', username: 'LocalName', channelId: 'channel' });
		const { createEconomyAccountNameResolver } = await import('../src/services/economyAccountNames');
		const resolve = createEconomyAccountNameResolver();
		const now = jest.spyOn(Date, 'now').mockReturnValue(1000000);
		mockGetUsersByIds.mockResolvedValueOnce([{ id: '401', displayName: 'NewName' }]);

		expect((await resolve([account]))[0].displayName).toBe('NewName');
		expect((await resolve([account]))[0].displayName).toBe('NewName');
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(1);

		now.mockReturnValue(1300001);
		mockGetUsersByIds.mockResolvedValueOnce([{ id: '401', displayName: 'NewerName' }]);
		expect((await resolve([account]))[0].displayName).toBe('NewerName');
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(2);

		now.mockReturnValue(1600002);
		mockGetUsersByIds.mockRejectedValueOnce(new Error('Twitch unavailable'));
		expect((await resolve([account]))[0].displayName).toBe('NewerName');
		expect((await BankAccount.findOne({ userId: '401' }))?.username).toBe('OldName');
	});

	it('uses local usernames or account names when Twitch is unavailable', async () => {
		await BankAccount.create([
			{ userId: '501', username: 'OldName', balance: { bank: 0, wallet: 0 } },
			{ userId: '502', username: 'SavedName', balance: { bank: 0, wallet: 0 } },
		]);
		await UserModel.create({ id: '501', username: 'LocalName', channelId: 'channel' });
		mockGetUsersByIds.mockRejectedValue(new Error('Twitch unavailable'));
		const response = await request(app).get('/api/v1/admin/economy/accounts').set('x-admin-token', token);
		expect(response.status).toBe(200);
		expect(response.body.items).toEqual(expect.arrayContaining([
			expect.objectContaining({ userId: '501', displayName: 'LocalName' }),
			expect.objectContaining({ userId: '502', displayName: 'SavedName' }),
		]));
	});

	it('splits Twitch lookups into batches of at most 100 IDs', async () => {
		await BankAccount.create(Array.from({ length: 101 }, (_, index) => ({
			userId: String(10000 + index), balance: { bank: 0, wallet: 0 },
		})));
		const response = await request(app).get('/api/v1/admin/economy/accounts')
			.set('x-admin-token', token).query({ limit: 101 });
		expect(response.status).toBe(200);
		expect(response.body.items).toHaveLength(101);
		expect(mockGetUsersByIds.mock.calls.map(call => call[0].length)).toEqual([100, 1]);
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
		process.env.ENABLE_CHAT = 'false';
		process.env.ENABLE_EVENTSUB = 'false';
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
		expect(mockRestartChat).not.toHaveBeenCalled();
		expect(mockStopChat).not.toHaveBeenCalled();
		expect(mockRecreateEventSubs).not.toHaveBeenCalled();
		Reflect.deleteProperty(process.env, 'ENABLE_CHAT');
		Reflect.deleteProperty(process.env, 'ENABLE_EVENTSUB');
	});

	it('serves admin pages and assets from the configured public directory', async () => {
		const createApp = (await import('../src/util/createApp')).default;
		const configured = createApp({ publicDir: path.resolve(__dirname, '..', 'public') });
		const page = await request(configured).get('/admin/eventsubs').set('x-admin-token', token);
		const css = await request(configured).get('/assets/css/admin.css');
		expect(page.status).toBe(200);
		expect(page.text).toContain('EventSub');
		expect(css.status).toBe(200);
	});

	it('keeps disabled integrations stopped for status, reload, join and part requests', async () => {
		process.env.ENABLE_CHAT = 'false';
		process.env.ENABLE_EVENTSUB = 'false';
		const status = await request(app).get('/api/v1/admin/status').set('x-admin-token', token);
		const reload = await request(app).post('/api/v1/admin/reload').set('x-admin-token', token);
		const join = await request(app).post('/api/v1/chat/join').set('x-admin-token', token).send({ username: 'test' });
		const part = await request(app).post('/api/v1/chat/part').set('x-admin-token', token).send({ username: 'test' });
		expect(status.body.chatConnected).toBe(false);
		expect(reload.status).toBe(200);
		expect(join.status).toBe(409);
		expect(part.status).toBe(409);
		expect(mockGetChatClient).not.toHaveBeenCalled();
		expect(mockJoinChannel).not.toHaveBeenCalled();
		expect(mockRestartChat).not.toHaveBeenCalled();
		expect(mockRecreateEventSubs).not.toHaveBeenCalled();
		Reflect.deleteProperty(process.env, 'ENABLE_CHAT');
		Reflect.deleteProperty(process.env, 'ENABLE_EVENTSUB');
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
