// Prevent DB/auth side-effects during import
jest.doMock(require.resolve('../../auth/authProvider'), () => ({ getChatAuthProvider: jest.fn() }));
jest.doMock(require.resolve('../../database/models/tokenModel'), () => ({ TokenModel: {} }));

describe('bots command', () => {

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('add - adds new bot and enqueues webhook', async () => {
		// Mock chat client
		jest.doMock(require.resolve('../../chat'), () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));

		// Mock userApi: channels.getChannelEditors and users.getUserByName
		jest.doMock(require.resolve('../../api/userApiClient'), () => ({
			getUserApi: jest.fn().mockResolvedValue({
				channels: { getChannelEditors: jest.fn().mockResolvedValue([{ userId: 'staff1' }]) },
				users: { getUserByName: jest.fn().mockResolvedValue({ id: 'bot-id-1' }) }
			})
		}));

		// Mock knownBotsModel as a constructor with static methods
		const insertMany = jest.fn().mockResolvedValue(undefined);
		const find = jest.fn().mockResolvedValue([]);
		const KnownBotsMock: any = function (this: any, doc: any) { Object.assign(this, doc); };
		KnownBotsMock.find = find;
		KnownBotsMock.insertMany = insertMany;
		jest.doMock(require.resolve('../../database/models/knownBotsModel'), () => ({ __esModule: true, default: KnownBotsMock }));

		// Mock constants and webhook enqueue
		jest.doMock(require.resolve('../../util/constants'), () => ({ broadcasterInfo: [{ id: 'b1', name: 't' }], commandUsageWebhookID: 'id', CommandUsageWebhookTOKEN: 'token' }));
		const enqueueMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock(require.resolve('../../Discord/webhookQueue'), () => ({ enqueueWebhook: enqueueMock }));

		const botsModule: any = await import('../../Commands/Information/bots');

		const chatModule = await import('../../chat');
		console.log('DEBUG chatModule keys:', Object.keys(chatModule));
		console.log('DEBUG getChatClient type:', typeof (chatModule as any).getChatClient);
		const chatClient = await (chatModule as any).getChatClient();

		const apiModule = await import('../../api/userApiClient');
		const knownBots = await import('../../database/models/knownBotsModel');
		console.log('DEBUG api.getUserApi type:', typeof apiModule.getUserApi);
		console.log('DEBUG knownBots exports:', Object.keys(knownBots));
		console.log('DEBUG find fn type:', typeof (knownBots as any).default.find);
		const msg: any = { userInfo: { userId: 'staff1', displayName: 'StaffOne' } };
		await botsModule.default.execute('#chan', 'StaffOne', ['add', 'somebot'], 'text', msg);

		console.log('DEBUG find calls:', (find as jest.Mock).mock.calls.length);
		console.log('DEBUG insertMany calls:', (insertMany as jest.Mock).mock.calls.length);
		console.log('DEBUG chatClient.say calls:', (chatClient.say as jest.Mock).mock.calls.length);
		console.log('DEBUG enqueueMock calls:', (enqueueMock as jest.Mock).mock.calls.length);

		expect(find).toHaveBeenCalled();
		expect(insertMany).toHaveBeenCalled();
		expect(chatClient.say).toHaveBeenCalled();
		expect(enqueueMock).toHaveBeenCalled();
	});

	test('info - returns bot metadata', async () => {
		jest.doMock(require.resolve('../../chat'), () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));
		jest.doMock(require.resolve('../../api/userApiClient'), () => ({ getUserApi: jest.fn().mockResolvedValue({ channels: { getChannelEditors: jest.fn().mockResolvedValue([]) } }) }));

		const botDoc = { username: 'somebot', addedBy: 'adder', addedFromChannel: 'chanx', addedAt: new Date().toISOString() };
		// Mock findOne to return an object with a .lean() method (Mongoose pattern)
		jest.doMock(require.resolve('../../database/models/knownBotsModel'), () => ({ __esModule: true, default: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(botDoc) }) } }));
		jest.doMock(require.resolve('../../util/constants'), () => ({ broadcasterInfo: [{ id: 'b1', name: 't' }], commandUsageWebhookID: '', CommandUsageWebhookTOKEN: '' }));

		const botsModule: any = await import('../../Commands/Information/bots');
		const chatModule = await import('../../chat');
		const chatClient = await (chatModule as any).getChatClient();

		const msg: any = { userInfo: { userId: 'u1' } };
		await botsModule.default.execute('#chan', 'user', ['info', 'somebot'], 'text', msg);

		expect(chatClient.say).toHaveBeenCalledWith('#chan', expect.stringContaining('somebot'));
	});

	test('remove - deletes bots and enqueues webhook', async () => {
		jest.doMock(require.resolve('../../chat'), () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));
		jest.doMock(require.resolve('../../api/userApiClient'), () => ({ getUserApi: jest.fn().mockResolvedValue({ channels: { getChannelEditors: jest.fn().mockResolvedValue([]) } }) }));

		const existing = [{ username: 'a' }, { username: 'b' }];
		const find = jest.fn().mockResolvedValue(existing);
		const deleteMany = jest.fn().mockResolvedValue({});
		jest.doMock(require.resolve('../../database/models/knownBotsModel'), () => ({ __esModule: true, default: { find, deleteMany } }));

		jest.doMock(require.resolve('../../util/constants'), () => ({ broadcasterInfo: [{ id: 'b1', name: 't' }], commandUsageWebhookID: 'id', CommandUsageWebhookTOKEN: 'token' }));
		const enqueueMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock(require.resolve('../../Discord/webhookQueue'), () => ({ enqueueWebhook: enqueueMock }));

		const botsModule: any = await import('../../Commands/Information/bots');
		const chatModule = await import('../../chat');
		const chatClient = await (chatModule as any).getChatClient();

		const msg: any = { userInfo: { userId: 'mod1', displayName: 'Mod', isMod: true } };
		await botsModule.default.execute('#chan', 'Mod', ['remove', 'a', 'b'], 'text', msg);

		expect(find).toHaveBeenCalled();
		expect(deleteMany).toHaveBeenCalled();
		expect(chatClient.say).toHaveBeenCalled();
		expect(enqueueMock).toHaveBeenCalled();
	});

	test('list - returns known bots', async () => {
		jest.doMock(require.resolve('../../chat'), () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) }) }));
		jest.doMock(require.resolve('../../api/userApiClient'), () => ({ getUserApi: jest.fn().mockResolvedValue({ channels: { getChannelEditors: jest.fn().mockResolvedValue([]) } }) }));

		const countDocuments = jest.fn().mockResolvedValue(2);
		const find = jest.fn().mockResolvedValue([{ username: 'a' }, { username: 'b' }]);
		jest.doMock(require.resolve('../../database/models/knownBotsModel'), () => ({ __esModule: true, default: { countDocuments, find } }));
		jest.doMock(require.resolve('../../util/constants'), () => ({ broadcasterInfo: [{ id: 'b1', name: 't' }], commandUsageWebhookID: '', CommandUsageWebhookTOKEN: '' }));

		const botsModule: any = await import('../../Commands/Information/bots');
		const chatModule = await import('../../chat');
		const chatClient = await (chatModule as any).getChatClient();

		const msg: any = { userInfo: { userId: 'u1' } };
		await botsModule.default.execute('#chan', 'user', ['list'], 'text', msg);

		expect(countDocuments).toHaveBeenCalled();
		expect(find).toHaveBeenCalled();
		expect(chatClient.say).toHaveBeenCalled();
	});

});
