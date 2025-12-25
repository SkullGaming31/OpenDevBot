import { jest } from '@jest/globals';

describe('ping command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('!ping returns uptime and twitch ping', async () => {
		const say = jest.fn();

		// mock chat client
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		// mock broadcaster info and userApiClient (broadcaster id and empty moderators so broadcaster check passes by id)
		jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: 'b1' }] }));
		jest.doMock('../api/userApiClient', () => ({
			getUserApi: async () => ({
				channels: { getChannelInfoById: async () => ({ id: 'b1' }) },
				moderation: { getModerators: async () => ({ data: [] }) },
				games: { getGameByName: async () => null },
			}),
		}));

		// mock TokenModel and axios used by checkTwitchApiPing
		jest.doMock('../database/models/tokenModel', () => ({ TokenModel: { findOne: (jest.fn() as any).mockResolvedValue({ access_token: 'token' }) } }));
		jest.doMock('axios', () => ({ get: (jest.fn() as any).mockResolvedValue({}), defaults: {} }));

		const cmd = await import('../Commands/Development/ping');

		const msg: any = { channelId: 'chan', userInfo: { userId: 'b1', userName: 'b1' } };
		await cmd.default.execute('canadiendragon', 'User', [], '', msg);

		expect(say).toHaveBeenCalled();
		const called = String(say.mock.calls[0][1]);
		expect(called).toMatch(/Twitch API Ping|Bot Uptime/i);
	});

	test('!ping game Vigor returns game id', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: 'b1' }] }));
		jest.doMock('../api/userApiClient', () => ({
			getUserApi: async () => ({
				channels: { getChannelInfoById: async () => ({ id: 'b1' }) },
				moderation: { getModerators: async () => ({ data: [] }) },
				games: { getGameByName: async (name: string) => (name.toLowerCase() === 'vigor' ? { id: '1234', name: 'Vigor' } : null) },
			}),
		}));

		jest.doMock('../database/models/tokenModel', () => ({ TokenModel: { findOne: (jest.fn() as any).mockResolvedValue({ access_token: 'token' }) } }));
		jest.doMock('axios', () => ({ get: (jest.fn() as any).mockResolvedValue({}), defaults: {} }));

		const cmd = await import('../Commands/Development/ping');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'b1', userName: 'b1' } };

		await cmd.default.execute('canadiendragon', 'User', ['game', 'Vigor'], '', msg);

		expect(say).toHaveBeenCalled();
		const found = say.mock.calls.find((c: any[]) => /ID is/.test(String(c[1])));
		expect(found).toBeDefined();
		const called = String(found ? found[1] : '');
		expect(called).toContain('1234');
	});

	test('!ping status returns status string', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: 'b1' }] }));
		jest.doMock('../api/userApiClient', () => ({
			getUserApi: async () => ({
				channels: { getChannelInfoById: async () => ({ id: 'b1' }) },
				moderation: { getModerators: async () => ({ data: [] }) },
				games: { getGameByName: async () => null },
			}),
		}));

		jest.doMock('../database/models/tokenModel', () => ({ TokenModel: { findOne: (jest.fn() as any).mockResolvedValue({ access_token: 'token' }) } }));
		jest.doMock('axios', () => ({ get: (jest.fn() as any).mockResolvedValue({}), defaults: {} }));

		const cmd = await import('../Commands/Development/ping');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'b1', userName: 'b1' } };

		await cmd.default.execute('canadiendragon', 'User', ['status'], '', msg);

		expect(say).toHaveBeenCalled();
		const called = String(say.mock.calls[0][1]);
		expect(called).toMatch(/Status — Twitch API:/i);
	});
});
