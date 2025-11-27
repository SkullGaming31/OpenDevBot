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
		expect(c.CommandUssageWebhookTOKEN).toBe('cutoken');

		// broadcaster info arrays should be present and start empty
		expect(Array.isArray(c.broadcasterInfo)).toBe(true);
		expect(Array.isArray(c.moderatorIDs)).toBe(true);
		expect(c.broadcasterInfo.length).toBe(0);
		expect(c.moderatorIDs.length).toBe(0);

		expect(c.openDevBotID).toBe('659523613');
	});
});
