jest.useRealTimers();

describe('gamble command', () => {
	afterEach(() => {
		jest.resetAllMocks();
		jest.resetModules();
	});

	test('insufficient funds informs user', async () => {
		jest.resetModules();
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined), onMessage: jest.fn() }) }));

		const debitMock = jest.fn();
		const creditMock = jest.fn();
		jest.doMock('../services/balanceAdapter', () => ({
			getOrCreate: jest.fn().mockResolvedValue({ userId: 'testuser', balance: 100 }),
			debitWallet: debitMock,
			creditWallet: creditMock,
		}));

		const chat = await import('../chat');
		const balanceAdapter = await import('../services/balanceAdapter');
		(balanceAdapter as any).debitWallet.mockResolvedValue(false);

		const gamble = (await import('../Commands/Fun/gamble')).default;

		const msg = { userInfo: { userId: 'testuser', userName: 'testuser' }, channelId: 'chan1' } as any;
		await gamble.execute('#chan', 'testuser', ['50'], '', msg);

		const chatClient = await (chat as any).getChatClient();
		expect(chatClient.say).toHaveBeenCalled();
		expect((chatClient.say as jest.Mock).mock.calls[0][1]).toMatch(/do not have enough coins/);
	});

	test('winning credits user and announces win', async () => {
		jest.resetModules();
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn().mockResolvedValue(undefined), onMessage: jest.fn() }) }));

		const debitMock = jest.fn();
		const creditMock = jest.fn();
		jest.doMock('../services/balanceAdapter', () => ({
			getOrCreate: jest.fn().mockResolvedValue({ userId: 'testuser', balance: 100 }),
			debitWallet: debitMock,
			creditWallet: creditMock,
		}));

		// Force deterministic randomness by mocking randomInt to always return a winning number
		jest.doMock('node:crypto', () => ({ randomInt: () => 1 }));

		const chat = await import('../chat');
		const balanceAdapter = await import('../services/balanceAdapter');
		(balanceAdapter as any).debitWallet.mockResolvedValue(true);
		(balanceAdapter as any).creditWallet.mockResolvedValue(undefined);

		const gamble = (await import('../Commands/Fun/gamble')).default;

		const msg = { userInfo: { userId: 'testuser', userName: 'testuser' }, channelId: 'chan1' } as any;
		await gamble.execute('#chan', 'testuser', ['10'], '', msg);

		const chatClient = await (chat as any).getChatClient();
		expect((balanceAdapter as any).debitWallet).toHaveBeenCalledWith('testuser', 10, 'testuser', 'chan1');
		expect((balanceAdapter as any).creditWallet).toHaveBeenCalledWith('testuser', 20, 'testuser', 'chan1');
		expect(chatClient.say).toHaveBeenCalled();
		expect((chatClient.say as jest.Mock).mock.calls[0][1]).toMatch(/You won/);
	});
});
