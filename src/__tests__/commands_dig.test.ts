import { jest } from '@jest/globals';

describe('dig command', () => {
	let _origMathRandom: typeof Math.random;
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		_origMathRandom = Math.random;
	});
	afterEach(() => {
		Math.random = _origMathRandom;
	});

	test('invalid amount shows usage', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		// prevent loading real UserModel
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOne: jest.fn() } }));

		const cmd = await import('../Commands/Fun/dig');
		await cmd.default.execute('#chan', 'User', [], '!dig', { channelId: 'chan', userInfo: {} } as any);
		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toContain('Usage');
	});

	test('out of bounds amount rejected', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOne: jest.fn() } }));

		const cmd = await import('../Commands/Fun/dig');
		await cmd.default.execute('#chan', 'User', ['50'], '!dig 50', { channelId: 'chan', userInfo: {} } as any);
		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toContain('Minimum/maximum bet amount');
	});

	test('insufficient balance rejected', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOne: (jest.fn() as any).mockResolvedValue({ balance: 50 }) } }));

		const cmd = await import('../Commands/Fun/dig');
		await cmd.default.execute('#chan', 'User', ['100'], '!dig 100', { channelId: 'chan', userInfo: { userName: 'user' } } as any);
		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toContain('don\'t have enough balance');
	});

	test('bomb loss deducts wallet and reports loss', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		// user has enough balance
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOne: (jest.fn() as any).mockResolvedValue({ balance: 200 }) } }));

		// mock balanceAdapter.debitWallet to succeed
		const debit = (jest.fn() as any).mockResolvedValue(true);
		jest.doMock('../services/balanceAdapter', () => ({ debitWallet: debit }));

		// randomInt: first call numBombs=1, subsequent shuffle calls return 1 to keep bomb at index 0
		const cryptoMock = { randomInt: (jest.fn() as any).mockImplementation(() => 1) } as any;
		jest.doMock('node:crypto', () => cryptoMock);

		// Math.random for random message selection (cast to any to satisfy TS)
		(Math as any).random = jest.fn().mockReturnValue(0.1);

		const cmd = await import('../Commands/Fun/dig');
		await cmd.default.execute('#chan', 'User', ['100'], '!dig 100', { channelId: 'chan', userInfo: { userName: 'user' } } as any);

		expect(debit).toHaveBeenCalled();
		expect(say).toHaveBeenCalled();
		const text = String(say.mock.calls[0][1]);
		expect(text).toMatch(/lost 100 gold|don't have enough wallet funds to place that bet/);
	});

	test('win awards prize and credits wallet', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		// user has enough balance
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOne: (jest.fn() as any).mockResolvedValue({ balance: 500 }) } }));

		const credit = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../services/balanceAdapter', () => ({ creditWallet: credit }));

		// randomInt sequence: first call numBombs=1, first shuffle call returns 0 to swap bomb away from index 0
		const r = jest.fn()
			.mockImplementationOnce(() => 1) // numBombs
			.mockImplementationOnce(() => 0) // first shuffle j=0 moves bomb away
			.mockImplementation(() => 0); // subsequent calls
		jest.doMock('node:crypto', () => ({ randomInt: r }));

		// deterministic prize via Math.random -> 0.5 (cast to any to satisfy TS)
		(Math as any).random = jest.fn().mockReturnValue(0.5);

		const cmd = await import('../Commands/Fun/dig');
		await cmd.default.execute('#chan', 'User', ['100'], '!dig 100', { channelId: 'chan', userInfo: { userName: 'user' } } as any);

		expect(credit).toHaveBeenCalled();
		expect(say).toHaveBeenCalled();
		const called = String(say.mock.calls[0][1]);
		expect(called).toMatch(/won \d+ gold/);
	});
});
