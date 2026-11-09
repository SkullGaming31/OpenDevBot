/* eslint-disable @typescript-eslint/no-explicit-any */

describe('chat lifecycle and message handling', () => {
	let chatClient: any;
	let lurkingUsers: Set<string>;
	let UserModel: any;
	let LurkMessageModel: any;
	let userApiClient: any;
	let usernames: string[];
	let broadcast: jest.Mock;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		jest.useFakeTimers();

		chatClient = {
			handlers: {} as Record<string, (...args: any[]) => unknown>,
			onJoin: jest.fn(function (this: any, cb) { this.handlers.join = cb; }),
			onPart: jest.fn(function (this: any, cb) { this.handlers.part = cb; }),
			onMessage: jest.fn(function (this: any, cb) { this.handlers.message = cb; }),
			onAuthenticationFailure: jest.fn(),
			connect: jest.fn(),
			join: jest.fn().mockResolvedValue(undefined),
			part: jest.fn().mockResolvedValue(undefined),
			reconnect: jest.fn(),
			say: jest.fn().mockResolvedValue(undefined),
			action: jest.fn().mockResolvedValue(undefined),
			disconnect: jest.fn().mockResolvedValue(undefined),
			isConnected: true,
		};
		lurkingUsers = new Set<string>();
		usernames = ['firstchannel', 'OpenDevBot'];
		UserModel = {
			find: jest.fn().mockResolvedValue([]),
			findOne: jest.fn().mockResolvedValue(null),
			findOneAndUpdate: jest.fn().mockResolvedValue(null),
			create: jest.fn().mockResolvedValue(null),
		};
		LurkMessageModel = {
			findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
			deleteOne: jest.fn().mockResolvedValue(undefined),
		};
		userApiClient = {
			streams: { getStreamByUserId: jest.fn().mockResolvedValue(null) },
			users: { getUserByName: jest.fn().mockResolvedValue({ id: 'user-1' }) },
			channels: {
				getChannelInfoById: jest.fn().mockResolvedValue({ id: '31124455' }),
				getChannelEditors: jest.fn().mockResolvedValue([]),
			},
			moderation: { checkUserMod: jest.fn().mockResolvedValue(true) },
			chat: { getChatters: jest.fn().mockResolvedValue({ data: [] }) },
		};
		broadcast = jest.fn();

		jest.doMock('@twurple/chat', () => ({
			ChatClient: jest.fn(() => chatClient),
		}));
		jest.doMock('fs', () => ({
			...jest.requireActual('fs'),
			readdirSync: jest.fn(() => []),
		}));
		jest.doMock('../src/api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue(userApiClient) }));
		jest.doMock('../src/auth/authProvider', () => ({ getChatAuthProvider: jest.fn().mockResolvedValue({}) }));
		jest.doMock('../src/database/tokenStore', () => ({ getUsernamesFromDatabase: jest.fn().mockResolvedValue(usernames) }));
		jest.doMock('../src/database/models/userModel', () => ({ UserModel }));
		jest.doMock('../src/database/models/LurkModel', () => ({ LurkMessageModel }));
		jest.doMock('../src/database/models/knownBotsModel', () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
		jest.doMock('../src/Commands/Information/lurk', () => ({ lurkingUsers }));
		jest.doMock('../src/util/constants', () => ({
			TwitchActivityWebhookID: 'webhook-id',
			TwitchActivityWebhookToken: 'webhook-token',
			broadcasterInfo: [{ id: '31124455', name: 'canadiendragon' }],
			openDevBotID: '659523613',
		}));
		jest.doMock('../src/util/util', () => ({ sleep: jest.fn().mockResolvedValue(undefined) }));
		jest.doMock('../src/util/monitorBroadcaster', () => ({ broadcast }));
		jest.doMock('../src/services/balanceAdapter', () => ({ creditWallet: jest.fn().mockResolvedValue(undefined) }));
		jest.doMock('../src/Discord/webhookQueue', () => ({ enqueueWebhook: jest.fn().mockResolvedValue(undefined) }));
	});

	afterEach(async () => {
		try {
			const { shutdownChat } = await import('../src/chat');
			await shutdownChat();
		} finally {
			jest.useRealTimers();
		}
	});

	test('connects once, reconnects for configured channels, and joins after the startup delay', async () => {
		const { initializeChat, joinedChannels } = await import('../src/chat');
		await initializeChat();

		expect(chatClient.connect).toHaveBeenCalledTimes(1);
		expect(chatClient.reconnect).toHaveBeenCalledTimes(1);
		expect(joinedChannels.has('opendevbot')).toBe(false);

		await jest.advanceTimersByTimeAsync(2000);
		expect(chatClient.join).toHaveBeenCalledWith('firstchannel');
		expect(joinedChannels.has('firstchannel')).toBe(true);
		expect(chatClient.join).not.toHaveBeenCalledWith('OpenDevBot');
	});

	test('normalizes dynamic channel joins and ignores the bot channel and duplicate joins', async () => {
		const { getChatClient, joinChannel, joinedChannels } = await import('../src/chat');
		await getChatClient();

		await joinChannel('#NewChannel');
		expect(chatClient.join).toHaveBeenCalledWith('NewChannel');
		expect(joinedChannels.has('NewChannel')).toBe(true);

		await joinChannel('OpenDevBot');
		expect(chatClient.join).toHaveBeenCalledTimes(1);

		chatClient.join.mockRejectedValueOnce(new Error('Already joined'));
		await expect(joinChannel('NewChannel')).resolves.toBeUndefined();
		expect(joinedChannels.has('NewChannel')).toBe(true);
	});

	test('message handler broadcasts, removes a chatter from lurk, and answers a mentioned saved lurk message', async () => {
		const savedMessage = { displayName: 'lurker', message: 'back soon' };
		LurkMessageModel.findOne
			.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(savedMessage) });
		lurkingUsers.add('Chatter');

		const { initializeChat } = await import('../src/chat');
		await initializeChat();

		const msg = {
			id: 'msg-1',
			userInfo: {
				displayName: 'Chatter',
				userId: 'user-1',
				isMod: false,
				isBroadcaster: false,
			},
		};
		await chatClient.handlers.message('#canadiendragon', 'Chatter', 'hello @lurker', msg);

		expect(broadcast).toHaveBeenCalledWith('chat:message', {
			channel: '#canadiendragon',
			user: 'Chatter',
			text: 'hello @lurker',
			id: 'msg-1',
			displayName: 'Chatter',
		});
		expect(lurkingUsers.has('Chatter')).toBe(false);
		expect(LurkMessageModel.deleteOne).toHaveBeenCalledWith({ id: 'user-1' });
		expect(chatClient.say).toHaveBeenNthCalledWith(1, '#canadiendragon', 'Chatter is no longer lurking');
		expect(chatClient.say).toHaveBeenNthCalledWith(2, '#canadiendragon', "Chatter, lurker's lurk message: back soon");
	});
});
