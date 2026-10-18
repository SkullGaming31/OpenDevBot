/* eslint-disable @typescript-eslint/no-explicit-any */

describe('EventSub listener lifecycle and handlers', () => {
	let handlers: Record<string, (...args: any[]) => unknown>;
	let listenerInstances: any[];
	let SubscriptionModel: any;
	let retryManager: any;
	let apiClient: any;
	let chatClient: any;
	let enqueueWebhook: jest.Mock;
	let broadcast: jest.Mock;
	let logger: any;
	let lurkingUsers: Set<string>;
	let previousEnvironment: string | undefined;
	const environment = process.env as Record<string, string | undefined>;

	const loadModule = async () => {
		jest.resetModules();
		handlers = {};
		listenerInstances = [];
		SubscriptionModel = {
			findOne: jest.fn().mockResolvedValue(null),
			updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
			findOneAndDelete: jest.fn().mockResolvedValue(null),
			deleteMany: jest.fn().mockResolvedValue(undefined),
		};
		retryManager = {
			markFailed: jest.fn().mockResolvedValue(undefined),
			markSucceeded: jest.fn().mockResolvedValue(undefined),
		};
		apiClient = {
			chat: { sendAnnouncement: jest.fn().mockResolvedValue(undefined) },
		};
		chatClient = {
			say: jest.fn().mockResolvedValue(undefined),
		};
		enqueueWebhook = jest.fn().mockResolvedValue(undefined);
		broadcast = jest.fn();
		logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		lurkingUsers = new Set(['viewer']);

		class MockEventSubWsListener {
			start = jest.fn();
			constructor(_options: unknown) {
				const proxy = new Proxy(this, {
					get: (target, property, receiver) => {
						if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
						if (typeof property === 'string' && property.startsWith('on')) {
							return (...args: any[]) => {
								handlers[property] = args[args.length - 1];
							};
						}
						return undefined;
					},
				});
				listenerInstances.push(proxy);
				return proxy;
			}
		}

		jest.doMock('@twurple/eventsub-ws', () => ({ EventSubWsListener: MockEventSubWsListener }));
		apiClient.channels = { getChannelInfoById: jest.fn().mockResolvedValue({ gameId: 'game-1' }) };
		jest.doMock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue(apiClient) }));
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue(chatClient) }));
		jest.doMock('../database/models/eventSubscriptions', () => ({ SubscriptionModel }));
		jest.doMock('../EventSub/retryManager', () => ({ __esModule: true, default: retryManager }));
		jest.doMock('../EventSub/subscriptionLimiter', () => ({ __esModule: true, default: { schedule: jest.fn() } }));
		jest.doMock('../Discord/webhookQueue', () => ({ enqueueWebhook }));
		jest.doMock('../util/logger', () => ({ __esModule: true, default: logger }));
		jest.doMock('../util/monitorBroadcaster', () => ({ broadcast }));
		jest.doMock('../util/constants', () => ({
			broadcasterInfo: [{ id: '31124455', name: 'canadiendragon' }],
			moderatorIDs: [],
			openDevBotID: '659523613',
			PromoteWebhookID: 'live-webhook',
			PromoteWebhookToken: 'live-token',
			TwitchActivityWebhookID: 'activity-webhook',
			TwitchActivityWebhookToken: 'activity-token',
		}));
		jest.doMock('../util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));
		jest.doMock('../Commands/Information/lurk', () => ({ lurkingUsers }));
		jest.doMock('../database/models/LurkModel', () => ({
			LurkMessageModel: { deleteMany: jest.fn().mockResolvedValue(undefined) },
		}));
		jest.doMock('../database/models/channel', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
		jest.doMock('../services/balanceAdapter', () => ({ creditWallet: jest.fn().mockResolvedValue(undefined) }));
		jest.doMock('../database/models/followMessages', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
		return import('../EventSubEvents');
	};

	beforeEach(() => {
		previousEnvironment = environment.ENVIRONMENT;
		environment.ENVIRONMENT = 'test';
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		if (previousEnvironment === undefined) delete environment.ENVIRONMENT;
		else environment.ENVIRONMENT = previousEnvironment;
	});

	test('persists a newly created subscription and clears its retry record', async () => {
		const { getEventSubs } = await loadModule();
		await getEventSubs();

		await handlers.onSubscriptionCreateSuccess({
			id: 'sub-1',
			authUserId: 'user-1',
			type: 'channel.follow',
			version: '2',
			condition: { broadcaster_user_id: '31124455' },
			status: 'enabled',
			transport: { method: 'websocket' },
		});

		expect(SubscriptionModel.updateOne).toHaveBeenCalledWith(
			{ subscriptionId: 'sub-1', authUserId: 'user-1' },
			{ $set: expect.objectContaining({ type: 'channel.follow', version: '2', status: 'enabled' }) },
			{ upsert: true },
		);
		expect(retryManager.markSucceeded).toHaveBeenCalledWith('sub-1', 'user-1');
	});

	test('treats an existing subscription as idempotent and does not overwrite it', async () => {
		const { getEventSubs } = await loadModule();
		SubscriptionModel.findOne.mockResolvedValue({ subscriptionId: 'sub-1' });
		await getEventSubs();

		await handlers.onSubscriptionCreateSuccess({ id: 'sub-1', authUserId: 'user-1' });

		expect(SubscriptionModel.updateOne).not.toHaveBeenCalled();
		expect(retryManager.markSucceeded).not.toHaveBeenCalled();
	});

	test('on create failure, removes stale duplicate records and records a retry', async () => {
		const { getEventSubs } = await loadModule();
		await getEventSubs();
		const conflict = new Error('Twitch returned 409 conflict');

		await handlers.onSubscriptionCreateFailure(
			{ id: 'sub-1', authUserId: 'user-1' },
			conflict,
		);

		expect(SubscriptionModel.findOneAndDelete).toHaveBeenCalledWith({
			subscriptionId: 'sub-1',
			authUserId: 'user-1',
		});
		expect(retryManager.markFailed).toHaveBeenCalledWith('sub-1', 'user-1', conflict.toString());
	});

	test('offline handler announces the end of stream and clears lurk state', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const lurkModel = require('../database/models/LurkModel').LurkMessageModel;

		await handlers.onStreamOffline({
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		});

		expect(apiClient.chat.sendAnnouncement).toHaveBeenCalledWith('31124455', {
			color: 'primary',
			message: 'Streamer has gone offline, thank you for stopping by!',
		});
		expect(enqueueWebhook).toHaveBeenCalledWith('live-webhook', 'live-token', {
			content: 'Streamer has gone offline',
		});
		expect(chatClient.say).toHaveBeenCalledWith(
			'canadiendragon',
			'dont forget you can join the Discord Server too, https://discord.com/invite/UhQuaASkKR',
		);
		expect(lurkingUsers.size).toBe(0);
		expect(lurkModel.deleteMany).toHaveBeenCalledWith({});
	});

	test('offline handler logs downstream failures rather than rejecting the EventSub callback', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		apiClient.chat.sendAnnouncement.mockRejectedValue(new Error('announcement unavailable'));
		await initializeTwitchEventSub();

		await expect(handlers.onStreamOffline({
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		})).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
		expect(lurkingUsers.has('viewer')).toBe(true);
	});

	test('follow handler uses built-in welcome messages when no configured messages exist', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		const FollowMessage = require('../database/models/followMessages').default;
		jest.spyOn(Math, 'random').mockReturnValue(0);
		await initializeTwitchEventSub();

		await handlers.onChannelFollow({
			userDisplayName: 'PixelPilot',
			getUser: jest.fn().mockResolvedValue({
				description: '',
				displayName: 'PixelPilot',
				profilePictureUrl: 'https://example.com/profile.png',
			}),
		});

		expect(FollowMessage.findOne).toHaveBeenNthCalledWith(1, { gameId: 'game-1' });
		expect(FollowMessage.findOne).toHaveBeenNthCalledWith(2, { name: 'default' });
		expect(chatClient.say).toHaveBeenCalledWith(
			'canadiendragon',
			expect.stringContaining('PixelPilot'),
		);
		expect(enqueueWebhook).toHaveBeenCalledWith(
			'activity-webhook',
			'activity-token',
			{ embeds: [expect.anything()] },
		);
		expect(broadcast).toHaveBeenCalledWith('eventsub:follow', {
			broadcaster: 'canadiendragon',
			user: 'PixelPilot',
		});
		expect(logger.warn).toHaveBeenCalledWith(
			'No default follow messages found; using built-in follow messages.',
		);
	});
});
