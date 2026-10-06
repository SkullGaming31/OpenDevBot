import { jest } from '@jest/globals';

describe('util/constants exports', () => {
	const OLD = { ...process.env };
	afterEach(() => {
		jest.resetModules();
		process.env = { ...OLD };
	});

	test('exports webhook env values and arrays', async () => {
		process.env.DEV_DISCORD_TWITCH_ACTIVITY_ID = 'wid';
		process.env.DEV_DISCORD_TWITCH_ACTIVITY_TOKEN = 'wtoken';
		process.env.DEV_DISCORD_PROMOTE_WEBHOOK_ID = 'pid';
		process.env.DEV_DISCORD_PROMOTE_WEBHOOK_TOKEN = 'ptoken';
		process.env.DISCORD_COMMAND_USAGE_ID = 'cuid';
		process.env.DISCORD_COMMAND_USAGE_TOKEN = 'cutoken';

		const c = await import('../util/constants');

		expect(c.TwitchActivityWebhookID).toBe('wid');
		expect(c.TwitchActivityWebhookToken).toBe('wtoken');
		expect(c.PromoteWebhookID).toBe('pid');
		expect(c.PromoteWebhookToken).toBe('ptoken');
		expect(c.commandUsageWebhookID).toBe('cuid');
		expect(c.CommandUsageWebhookTOKEN).toBe('cutoken');

		// broadcaster info arrays should be present and start empty
		expect(Array.isArray(c.broadcasterInfo)).toBe(true);
		expect(Array.isArray(c.moderatorIDs)).toBe(true);
		expect(c.broadcasterInfo.length).toBe(0);
		expect(c.moderatorIDs.length).toBe(0);

		expect(c.openDevBotID).toBe('659523613');
	});

	test('skips token records without a valid user ID during initialization', async () => {
		const userTokens = [
			{ login: 'unidentified', access_token: 'not-loaded' },
			{ user_id: '123', login: 'streamer', access_token: 'loaded' },
		];
		const lean: any = jest.fn();
		lean.mockResolvedValue(userTokens);
		const find: any = jest.fn(() => ({
			lean,
		}));
		const getChannelInfoById: any = jest.fn();
		getChannelInfoById.mockResolvedValue({
			delay: 0,
			displayName: 'streamer',
			gameId: '',
			gameName: '',
			id: '123',
			language: 'en',
			name: 'streamer',
			tags: [],
			title: '',
			getBroadcaster: jest.fn(),
			getGame: jest.fn(),
		});
		await jest.isolateModulesAsync(async () => {
			jest.doMock('../database/models/tokenModel', () => ({ TokenModel: { find } }));
			jest.doMock('../api/userApiClient', () => ({
				getUserApi: (jest.fn() as any).mockResolvedValue({
					channels: { getChannelInfoById },
				}),
			}));

			const constants = await import('../util/constants');
			await expect(constants.initializeConstants()).resolves.toBeUndefined();

			expect(getChannelInfoById).toHaveBeenCalledWith('123');
			expect(getChannelInfoById).toHaveBeenCalledTimes(2);
		});
	});
});
