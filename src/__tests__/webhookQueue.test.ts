import { useInMemorySqliteDatabase } from './sqliteTestSetup';

const mockWebhookSend = jest.fn();

jest.mock('discord.js', () => ({
	WebhookClient: jest.fn().mockImplementation(() => ({
		send: mockWebhookSend,
		destroy: jest.fn(),
	})),
}));

useInMemorySqliteDatabase();

const environmentKeys = ['ENVIRONMENT', 'DISCORD_WEBHOOK_DRY_RUN'];
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

describe('Discord webhook queue dry-run mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.ENVIRONMENT = 'dev';
		process.env.DISCORD_WEBHOOK_DRY_RUN = 'true';
	});

	afterAll(() => {
		for (const key of environmentKeys) {
			const original = originalEnvironment.get(key);
			if (original === undefined) Reflect.deleteProperty(process.env, key);
			else process.env[key] = original;
		}
	});

	it('persists dry-run events as pending without constructing a Discord client', async () => {
		const { enqueueWebhook } = await import('../Discord/webhookQueue');
		const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;

		await enqueueWebhook('real-webhook-id', 'real-webhook-token', {
			embeds: [{ title: 'Dry-run follow event' }],
		});

		const items = await WebhookQueueModel.find({ status: 'pending' }).lean();
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			webhookId: 'dry-run',
			token: '',
			event: 'Dry-run follow event',
			status: 'pending',
			dryRun: true,
		});
		expect(mockWebhookSend).not.toHaveBeenCalled();
	});

	it('does not deliver pending dry-run records during queue initialization', async () => {
		const WebhookQueueModel = (await import('../database/models/webhookQueue')).default;
		await WebhookQueueModel.create({
			webhookId: 'dry-run',
			token: '',
			payload: { content: 'sample' },
			event: 'sample',
			status: 'pending',
			attempts: 0,
			dryRun: true,
		});

		const { initializeWebhookQueue } = await import('../Discord/webhookQueue');
		await initializeWebhookQueue();

		const item = await WebhookQueueModel.findOne({ event: 'sample' }).lean();
		expect(item?.status).toBe('pending');
		expect(mockWebhookSend).not.toHaveBeenCalled();
	});

	it('rejects dry-run enqueueing outside dev/debug without sending', async () => {
		process.env.ENVIRONMENT = 'prod';
		const { enqueueWebhook } = await import('../Discord/webhookQueue');

		await expect(enqueueWebhook('webhook-id', 'token', 'sample')).rejects.toThrow(
			'Discord webhook dry-run is only allowed in dev/debug environments',
		);
		expect(mockWebhookSend).not.toHaveBeenCalled();
	});
});
