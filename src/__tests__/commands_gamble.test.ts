import { jest } from '@jest/globals';

describe('gamble command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('missing args prompts usage', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../services/balanceAdapter', () => ({ getOrCreate: (jest.fn() as any).mockResolvedValue({ userId: 'u1', balance: 100 }) }));
		jest.doMock('node:crypto', () => ({ randomInt: (jest.fn() as any) }));

		const cmd = await import('../Commands/Fun/gamble');

		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };
		await cmd.default.execute('#chan', 'User', [], '', msg);

		expect(say).toHaveBeenCalled();
		// usage message should be sent when args missing
		expect(say.mock.calls[0][1]).toContain('Usage');
	});

	test('insufficient funds path', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../services/balanceAdapter', () => ({ getOrCreate: (jest.fn() as any).mockResolvedValue({ userId: 'u1', balance: 10 }), debitWallet: (jest.fn() as any).mockResolvedValue(false) }));
		jest.doMock('node:crypto', () => ({ randomInt: (jest.fn() as any) }));

		const cmd = await import('../Commands/Fun/gamble');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#chan', 'User', ['5'], '', msg);
		expect(say).toHaveBeenCalled();
		const called = say.mock.calls[0][1];
		expect(called).toMatch(/do not have enough/i);
	});

	test('win path credits winnings and announces', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		const debit = (jest.fn() as any).mockResolvedValue(true);
		const credit = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../services/balanceAdapter', () => ({ getOrCreate: (jest.fn() as any).mockResolvedValue({ userId: 'u1', balance: 100 }), debitWallet: debit, creditWallet: credit }));
		// force win
		jest.doMock('node:crypto', () => ({ randomInt: (jest.fn() as any).mockReturnValue(1) }));

		const cmd = await import('../Commands/Fun/gamble');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#chan', 'User', ['10'], '', msg);

		expect(debit).toHaveBeenCalledWith('u1', 10, 'u1', 'chan');
		// winnings = amount * 2
		expect(credit).toHaveBeenCalledWith('u1', 20, 'u1', 'chan');
		expect(say).toHaveBeenCalled();
		const announced = say.mock.calls.find((c: any[]) => /Congratulations/.test(String(c[1])) || /won/.test(String(c[1])));
		expect(announced).toBeTruthy();
	});

	test('lose path announces loss and does not credit', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		const debit = (jest.fn() as any).mockResolvedValue(true);
		const credit = (jest.fn() as any);
		jest.doMock('../services/balanceAdapter', () => ({ getOrCreate: (jest.fn() as any).mockResolvedValue({ userId: 'u1', balance: 100 }), debitWallet: debit, creditWallet: credit }));
		// force loss (randomInt > 3)
		jest.doMock('node:crypto', () => ({ randomInt: (jest.fn() as any).mockReturnValue(10) }));

		const cmd = await import('../Commands/Fun/gamble');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#chan', 'User', ['15'], '', msg);

		expect(debit).toHaveBeenCalledWith('u1', 15, 'u1', 'chan');
		expect(credit).not.toHaveBeenCalled();
		const announced = say.mock.calls.find((c: any[]) => /lost/.test(String(c[1])));
		expect(announced).toBeTruthy();
	});
});
