// Prevent modules with DB side-effects from running at import time during these unit tests
jest.doMock('../auth/authProvider', () => ({ getChatAuthProvider: jest.fn() }));
jest.doMock('../database/models/tokenModel', () => ({ TokenModel: {} }));
jest.doMock('../api/userApiClient', () => ({ getUserApi: jest.fn().mockResolvedValue({}) }));
jest.doMock('../util/constants', () => ({ broadcasterInfo: [{ id: '1', name: 'canadiendragon' }], moderatorIDs: [], PromoteWebhookID: '', PromoteWebhookToken: '', TwitchActivityWebhookID: '', TwitchActivityWebhookToken: '' }));

describe('migrated command unit tests (beg, dig, roulette)', () => {

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('beg executes success path and calls balanceAdapter.creditWallet', async () => {
		// Mock chat client
		jest.doMock('../chat', () => ({
			getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) })
		}));

		// Mock balanceAdapter
		const creditMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../services/balanceAdapter', () => ({
			creditWallet: creditMock,
		}));

		// Mock crypto.randomInt to force success and deterministic amount/index
		jest.doMock('crypto', () => ({
			randomInt: jest.fn()
				.mockImplementationOnce(() => 10) // successChance check -> 10 <= 30 -> success
				.mockImplementationOnce(() => 37) // amount awarded
				.mockImplementationOnce(() => 0)  // successResponses index
		}));

		// Mock UserModel.findOne to make lastBegTime old
		const userMock = { lastBegTime: new Date(0) };
		jest.doMock('../database/models/userModel', () => ({
			UserModel: { findOne: jest.fn().mockResolvedValue(userMock), updateOne: jest.fn().mockResolvedValue(undefined) }
		}));

		const beg: any = await import('../Commands/Fun/beg');

		const msg: any = { channelId: 'chan1', userInfo: { userId: '123', userName: 'tester' } };
		const chatModule = await import('../chat');
		const chatClient = await (chatModule as any).getChatClient();

		await beg.default.execute('chan', 'Tester', [], '', msg);

		// creditWallet should be called with userKey '123' and amount 37
		const adapter = await import('../services/balanceAdapter');
		expect((adapter as any).creditWallet).toHaveBeenCalledWith('123', 37, 'tester', 'chan1');
		expect(chatClient.say).toHaveBeenCalled();
	});

	test('dig bomb path debits wallet via balanceAdapter.debitWallet', async () => {
		jest.doMock('../chat', () => ({
			getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) })
		}));

		const debitMock = jest.fn().mockResolvedValue(true);
		const creditMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../services/balanceAdapter', () => ({
			debitWallet: debitMock,
			creditWallet: creditMock
		}));

		// Mock UserModel.findOne to show sufficient balance
		jest.doMock('../database/models/userModel', () => ({
			UserModel: { findOne: jest.fn().mockResolvedValue({ balance: 100 }), updateOne: jest.fn().mockResolvedValue(undefined) }
		}));

		// Force numBombs = 1 and shuffling that leaves bomb at index 0: sequence [1,4,3,2,1]
		jest.doMock('node:crypto', () => ({
			randomInt: jest.fn()
				.mockImplementationOnce(() => 1)
				.mockImplementationOnce(() => 4)
				.mockImplementationOnce(() => 3)
				.mockImplementationOnce(() => 2)
				.mockImplementationOnce(() => 1)
		}));

		const dig: any = await import('../Commands/Fun/dig');
		const msg: any = { channelId: 'chan1', userInfo: { userId: 'u1', userName: 'u1' } };
		const chatModule = await import('../chat');
		const chatClient = await (chatModule as any).getChatClient();

		await dig.default.execute('chan', 'u1', ['100'], '', msg);

		const adapter = await import('../services/balanceAdapter');
		expect((adapter as any).debitWallet).toHaveBeenCalled();
		expect(chatClient.say).toHaveBeenCalled();
	});

	test('dig prize path credits wallet via balanceAdapter.creditWallet', async () => {
		jest.doMock('../chat', () => ({
			getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) })
		}));

		const debitMock = jest.fn().mockResolvedValue(true);
		const creditMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../services/balanceAdapter', () => ({
			debitWallet: debitMock,
			creditWallet: creditMock
		}));

		jest.doMock('../database/models/userModel', () => ({
			UserModel: { findOne: jest.fn().mockResolvedValue({ balance: 100 }), updateOne: jest.fn().mockResolvedValue(undefined) }
		}));

		// Force numBombs = 1 and shuffling that moves bomb away from index 0: sequence [1,0,0,0,0]
		jest.doMock('node:crypto', () => ({
			randomInt: jest.fn()
				.mockImplementationOnce(() => 1)
				.mockImplementationOnce(() => 0)
				.mockImplementationOnce(() => 0)
				.mockImplementationOnce(() => 0)
				.mockImplementationOnce(() => 0)
				.mockImplementationOnce(() => 250) // prize amount
		}));

		const dig: any = await import('../Commands/Fun/dig');
		const msg: any = { channelId: 'chan1', userInfo: { userId: 'u1', userName: 'u1' } };
		const chatModule = await import('../chat');
		const chatClient = await (chatModule as any).getChatClient();

		await dig.default.execute('chan', 'u1', ['100'], '', msg);

		const adapter = await import('../services/balanceAdapter');
		expect((adapter as any).creditWallet).toHaveBeenCalled();
		expect(chatClient.say).toHaveBeenCalled();
	});

	test('roulette win path calls balanceAdapter.creditWallet', async () => {
		jest.doMock('../chat', () => ({
			getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined) })
		}));

		const creditMock = jest.fn().mockResolvedValue(undefined);
		jest.doMock('../services/balanceAdapter', () => ({ creditWallet: creditMock }));

		// Mock ChamberStateModel to return existing state
		// export a mock model function that also has a findOne property (Mongoose model shape)
		const mockModel: any = {};
		mockModel.findOne = jest.fn().mockResolvedValue({ userId: 'u1', bullets: 1, save: jest.fn() });
		jest.doMock('../database/models/roulette', () => ({ __esModule: true, default: mockModel }));

		// Mock getUserApi to indicate the user is staff (moderator/broadcaster)
		jest.doMock('../api/userApiClient', () => ({
			getUserApi: jest.fn().mockResolvedValue({
				channels: { getChannelInfoById: jest.fn().mockResolvedValue({ id: 'b1' }) },
				moderation: { getModerators: jest.fn().mockResolvedValue({ data: [{ userId: 'u1' }] }) }
			})
		}));

		// randomInt: first -> randomPosition (2 -> no bullet), second -> rewardGold
		jest.doMock('node:crypto', () => ({ randomInt: jest.fn().mockImplementationOnce(() => 2).mockImplementationOnce(() => 600) }));

		const roulette: any = await import('../Commands/Fun/roulette');
		const msg: any = { channelId: 'chan1', userInfo: { userId: 'u1', userName: 'u1', displayName: 'u1' } };
		const chatModule = await import('../chat');
		const chatClient = await (chatModule as any).getChatClient();

		await roulette.default.execute('chan', 'u1', [], '', msg);

		const adapter = await import('../services/balanceAdapter');
		expect((adapter as any).creditWallet).toHaveBeenCalled();
		expect(chatClient.say).toHaveBeenCalled();
	});

});
