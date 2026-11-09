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
	let previousChatFlag: string | undefined;
	let getExistingChatClient: jest.Mock;
	let initializeConstants: jest.Mock;
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
			isConnected: true,
		};
		getExistingChatClient = jest.fn(() => chatClient);
		enqueueWebhook = jest.fn().mockResolvedValue(undefined);
		broadcast = jest.fn();
		logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		lurkingUsers = new Set(['viewer']);
		initializeConstants = jest.fn().mockResolvedValue(undefined);

		class MockEventSubWsListener {
			start = jest.fn();
			stop = jest.fn();
			callbacks: Record<string, (...args: any[]) => unknown> = {};
			constructor(_options: unknown) {
				const proxy = new Proxy(this, {
					get: (target, property, receiver) => {
						if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
						if (typeof property === 'string' && property.startsWith('on')) {
							return (...args: any[]) => {
								handlers[property] = args[args.length - 1];
								target.callbacks[property] = args[args.length - 1];
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
		jest.doMock('../src/api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue(apiClient) }));
		jest.doMock('../src/chat', () => ({ getExistingChatClient }));
		jest.doMock('../src/database/models/eventSubscriptions', () => ({ SubscriptionModel }));
		jest.doMock('../src/EventSub/retryManager', () => ({ __esModule: true, default: retryManager }));
		jest.doMock('../src/EventSub/subscriptionLimiter', () => ({ __esModule: true, default: { schedule: jest.fn() } }));
		jest.doMock('../src/Discord/webhookQueue', () => ({ enqueueWebhook }));
		jest.doMock('../src/util/logger', () => ({ __esModule: true, default: logger }));
		jest.doMock('../src/util/monitorBroadcaster', () => ({ broadcast }));
		jest.doMock('../src/util/constants', () => ({
			initializeConstants,
			broadcasterInfo: [{ id: '31124455', name: 'canadiendragon' }],
			moderatorIDs: [],
			openDevBotID: '659523613',
			PromoteWebhookID: 'live-webhook',
			PromoteWebhookToken: 'live-token',
			TwitchActivityWebhookID: 'activity-webhook',
			TwitchActivityWebhookToken: 'activity-token',
		}));
		jest.doMock('../src/util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));
		jest.doMock('../src/Commands/Information/lurk', () => ({ lurkingUsers }));
		jest.doMock('../src/database/models/LurkModel', () => ({
			LurkMessageModel: { deleteMany: jest.fn().mockResolvedValue(undefined) },
		}));
		jest.doMock('../src/database/models/channel', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
		jest.doMock('../src/services/balanceAdapter', () => ({ creditWallet: jest.fn().mockResolvedValue(undefined) }));
		jest.doMock('../src/database/models/followMessages', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
		return import('../src/EventSubEvents');
	};

	beforeEach(() => {
		previousEnvironment = environment.ENVIRONMENT;
		previousChatFlag = environment.ENABLE_CHAT;
		environment.ENVIRONMENT = 'test';
		environment.ENABLE_CHAT = 'true';
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		if (previousEnvironment === undefined) delete environment.ENVIRONMENT;
		else environment.ENVIRONMENT = previousEnvironment;
		if (previousChatFlag === undefined) delete environment.ENABLE_CHAT;
		else environment.ENABLE_CHAT = previousChatFlag;
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

	test('keeps event handlers on the same listener when the socket disconnects', async () => {
		const { initializeTwitchEventSub, getEventSubs } = await loadModule();
		await initializeTwitchEventSub();
		const listener = listenerInstances[0];
		const followHandler = listener.callbacks.onChannelFollow;
		await listener.callbacks.onUserSocketDisconnect('user-1', new Error('connection lost'));
		expect(await getEventSubs()).toBe(listener);
		expect(listenerInstances).toHaveLength(1);
		expect(listener.stop).not.toHaveBeenCalled();
		expect(listener.callbacks.onChannelFollow).toBe(followHandler);
		expect(logger.error).toHaveBeenCalledWith('Socket disconnected for user user-1', expect.any(Error));
	});

	test('reloads one listener with functional handlers and coalesces concurrent reloads', async () => {
		const { initializeTwitchEventSub, recreateEventSubs } = await loadModule();
		await initializeTwitchEventSub();
		const old = listenerInstances[0];
		await Promise.all([recreateEventSubs(), recreateEventSubs()]);
		expect(initializeConstants).toHaveBeenCalledTimes(1);
		expect(old.stop).toHaveBeenCalledTimes(1);
		expect(listenerInstances).toHaveLength(2);
		const replacement = listenerInstances[1];
		expect(replacement.callbacks.onChannelFollow).toEqual(expect.any(Function));
		await replacement.callbacks.onChannelFollow({
			userDisplayName: 'PixelPilot',
			getUser: jest.fn().mockResolvedValue({ description: '', displayName: 'PixelPilot', profilePictureUrl: 'https://example.com/p.png' }),
		});
		expect(broadcast).toHaveBeenCalledWith('eventsub:follow', { broadcaster: 'canadiendragon', user: 'PixelPilot' });
	});

	test('preserves the existing listener if broadcaster refresh fails', async () => {
		const { initializeTwitchEventSub, recreateEventSubs, getEventSubs } = await loadModule();
		await initializeTwitchEventSub();
		const old = listenerInstances[0];
		initializeConstants.mockRejectedValueOnce(new Error('refresh failed'));
		await expect(recreateEventSubs()).rejects.toThrow('refresh failed');
		expect(old.stop).not.toHaveBeenCalled();
		expect(await getEventSubs()).toBe(old);
		expect(old.callbacks.onChannelFollow).toEqual(expect.any(Function));
	});

	test('allows a later reload after replacement initialization fails', async () => {
		const { initializeTwitchEventSub, recreateEventSubs } = await loadModule();
		await initializeTwitchEventSub();
		const old = listenerInstances[0];
		const getUserApi = require('../src/api/userApiClient').getUserApi;
		getUserApi.mockRejectedValueOnce(new Error('API unavailable'));
		await expect(recreateEventSubs()).rejects.toThrow('API unavailable');
		expect(old.stop).toHaveBeenCalledTimes(1);
		await expect(recreateEventSubs()).resolves.toBeUndefined();
		expect(listenerInstances).toHaveLength(2);
		expect(listenerInstances[1].callbacks.onChannelFollow).toEqual(expect.any(Function));
	});

	test('emits the matching stream monitor event on each transition', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		await handlers.onStreamOnline({
			getStream: jest.fn().mockResolvedValue({ userDisplayName: 'Streamer' }),
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		});
		expect(broadcast.mock.calls.filter(call => call[0].startsWith('eventsub:stream'))).toEqual([
			['eventsub:streamOnline', { broadcaster: 'canadiendragon', displayName: 'Streamer' }],
		]);
		await handlers.onStreamOffline({ getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }) });
		expect(broadcast.mock.calls.filter(call => call[0].startsWith('eventsub:stream'))).toEqual([
			['eventsub:streamOnline', { broadcaster: 'canadiendragon', displayName: 'Streamer' }],
			['eventsub:streamOffline', { broadcaster: 'canadiendragon', displayName: 'Streamer' }],
		]);
	});

	test('uses broadcaster name when the online stream lookup fails', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const error = new Error('stream lookup unavailable');
		await expect(handlers.onStreamOnline({
			getStream: jest.fn().mockRejectedValue(error),
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		})).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('Failed to look up online stream details', error);
		expect(broadcast).toHaveBeenCalledWith('eventsub:streamOnline', { broadcaster: 'canadiendragon', displayName: 'Streamer' });
		expect(apiClient.chat.sendAnnouncement).toHaveBeenCalledWith('31124455', expect.objectContaining({ message: expect.stringContaining('Streamer') }));
		expect(enqueueWebhook).toHaveBeenCalledTimes(1);
	});

	test('uses the configured channel name when both online lookups fail', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const error = new Error('Twitch unavailable');
		await expect(handlers.onStreamOnline({
			getStream: jest.fn().mockRejectedValue(error),
			getBroadcaster: jest.fn().mockRejectedValue(error),
		})).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('Failed to look up online stream details', error);
		expect(logger.warn).toHaveBeenCalledWith('Failed to look up online stream broadcaster', error);
		expect(broadcast).toHaveBeenCalledWith('eventsub:streamOnline', { broadcaster: 'canadiendragon', displayName: 'canadiendragon' });
		expect(enqueueWebhook).toHaveBeenCalledTimes(1);
	});

	test('uses stream metadata when the online broadcaster lookup fails', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const error = new Error('broadcaster unavailable');
		await handlers.onStreamOnline({
			getStream: jest.fn().mockResolvedValue({ userDisplayName: 'Streamer' }),
			getBroadcaster: jest.fn().mockRejectedValue(error),
		});
		expect(logger.warn).toHaveBeenCalledWith('Failed to look up online stream broadcaster', error);
		expect(broadcast).toHaveBeenCalledWith('eventsub:streamOnline', { broadcaster: 'canadiendragon', displayName: 'Streamer' });
	});

	test('uses the configured channel name and clears lurks when offline lookup fails', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const error = new Error('broadcaster lookup unavailable');
		await expect(handlers.onStreamOffline({ getBroadcaster: jest.fn().mockRejectedValue(error) })).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('Failed to look up offline stream broadcaster', error);
		expect(broadcast).toHaveBeenCalledWith('eventsub:streamOffline', { broadcaster: 'canadiendragon', displayName: 'canadiendragon' });
		expect(enqueueWebhook).toHaveBeenCalledTimes(1);
		expect(lurkingUsers.size).toBe(0);
		expect(require('../src/database/models/LurkModel').LurkMessageModel.deleteMany).toHaveBeenCalledWith({});
	});

	test('clears lurks even if offline webhook delivery fails', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const error = new Error('webhook queue unavailable');
		enqueueWebhook.mockRejectedValue(error);
		await expect(handlers.onStreamOffline({
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		})).resolves.toBeUndefined();
		expect(logger.error).toHaveBeenCalledWith(error);
		expect(lurkingUsers.size).toBe(0);
		expect(require('../src/database/models/LurkModel').LurkMessageModel.deleteMany).toHaveBeenCalledWith({});
	});

	test('logs offline lurk persistence cleanup failures', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const error = new Error('database unavailable');
		require('../src/database/models/LurkModel').LurkMessageModel.deleteMany.mockRejectedValue(error);
		await expect(handlers.onStreamOffline({
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		})).resolves.toBeUndefined();
		expect(logger.error).toHaveBeenCalledWith('Failed to clear lurk messages after stream offline', error);
		expect(lurkingUsers.size).toBe(0);
		expect(broadcast).toHaveBeenCalledWith('eventsub:streamOffline', expect.anything());
	});

	test.each([null, { gameId: '' }])('uses default follow messages without a category (%p)', async channel => {
		const { initializeTwitchEventSub } = await loadModule();
		apiClient.channels.getChannelInfoById.mockResolvedValue(channel);
		const FollowMessage = require('../src/database/models/followMessages').default;
		FollowMessage.findOne.mockResolvedValue({ messages: ['Welcome ${e.userDisplayName}'] });
		await initializeTwitchEventSub();
		await handlers.onChannelFollow({
			userDisplayName: 'PixelPilot',
			getUser: jest.fn().mockResolvedValue({ description: '', displayName: 'PixelPilot', profilePictureUrl: 'https://example.com/p.png' }),
		});
		expect(FollowMessage.findOne).toHaveBeenCalledWith({ name: 'default' });
		expect(enqueueWebhook).toHaveBeenCalledTimes(1);
		expect(broadcast).toHaveBeenCalledWith('eventsub:follow', expect.objectContaining({ user: 'PixelPilot' }));
	});

	test('offline handler announces the end of stream and clears lurk state', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		const lurkModel = require('../src/database/models/LurkModel').LurkMessageModel;

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

	test('offline handler logs chat failures and continues other event processing', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		apiClient.chat.sendAnnouncement.mockRejectedValue(new Error('announcement unavailable'));
		await initializeTwitchEventSub();

		await expect(handlers.onStreamOffline({
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		})).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith('EventSub chat API action failed', expect.any(Error));
		expect(enqueueWebhook).toHaveBeenCalled();
		expect(lurkingUsers.has('viewer')).toBe(false);
	});

	test('registers EventSub without starting chat and skips chat output while disabled', async () => {
		environment.ENABLE_CHAT = 'false';
		const { initializeTwitchEventSub } = await loadModule();
		await initializeTwitchEventSub();
		expect(getExistingChatClient).not.toHaveBeenCalled();
		expect(handlers.onStreamOffline).toEqual(expect.any(Function));

		await handlers.onStreamOffline({
			getBroadcaster: jest.fn().mockResolvedValue({ displayName: 'Streamer' }),
		});

		expect(getExistingChatClient).not.toHaveBeenCalled();
		expect(chatClient.say).not.toHaveBeenCalled();
		expect(apiClient.chat.sendAnnouncement).not.toHaveBeenCalled();
		expect(enqueueWebhook).toHaveBeenCalled();
		expect(lurkingUsers.size).toBe(0);
	});

	test('handles missing and restarted chat clients at event time without stopping notifications', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		getExistingChatClient.mockReturnValue(undefined);
		await initializeTwitchEventSub();
		expect(getExistingChatClient).not.toHaveBeenCalled();
		const event = {
			userDisplayName: 'PixelPilot',
			getUser: jest.fn().mockResolvedValue({
				description: '', displayName: 'PixelPilot', profilePictureUrl: 'https://example.com/profile.png',
			}),
		};
		await handlers.onChannelFollow(event);
		expect(logger.warn).toHaveBeenCalledWith('EventSub chat message skipped: chat is not connected');
		expect(enqueueWebhook).toHaveBeenCalledTimes(1);
		expect(broadcast).toHaveBeenCalledWith('eventsub:follow', expect.anything());

		getExistingChatClient.mockReturnValue(chatClient);
		chatClient.say.mockRejectedValueOnce(new Error('chat unavailable'));
		await handlers.onChannelFollow(event);
		expect(logger.warn).toHaveBeenCalledWith('EventSub chat message failed', expect.any(Error));
		expect(enqueueWebhook).toHaveBeenCalledTimes(2);
		await handlers.onChannelFollow(event);
		expect(chatClient.say).toHaveBeenCalledTimes(2);
		expect(enqueueWebhook).toHaveBeenCalledTimes(3);
	});

	test('follow handler uses built-in welcome messages when no configured messages exist', async () => {
		const { initializeTwitchEventSub } = await loadModule();
		const FollowMessage = require('../src/database/models/followMessages').default;
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
