import { jest } from '@jest/globals';

describe('quote command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('add quote saves and announces', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		const cmd = await import('../Commands/Information/quote');
		// import the real model and stub the prototype save and static methods
		const QuoteMod = await import('../database/models/Quote');
		(QuoteMod.default.prototype as any).save = (jest.fn() as any).mockResolvedValue({ _id: '1', content: 'hello world' });
		(QuoteMod.default as any).findByIdAndDelete = (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(null) });
		(QuoteMod.default as any).findById = (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(null) });
		(QuoteMod.default as any).countDocuments = (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(0) });
		(QuoteMod.default as any).findOne = (jest.fn() as any).mockReturnValue({ skip: (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(null) }) });

		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };
		await cmd.default.execute('#canadiendragon', 'User', ['add', 'hello', 'world'], 'text', msg);

		expect(say).toHaveBeenCalled();
		expect(say.mock.calls[0][1]).toContain('Quote Added to database');
	});

	test('remove quote not found announces not found', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		const cmd = await import('../Commands/Information/quote');
		const QuoteMod = await import('../database/models/Quote');
		(QuoteMod.default as any).findByIdAndDelete = (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(null) });
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#canadiendragon', 'User', ['remove', 'abc123'], 'text', msg);

		expect(say).toHaveBeenCalled();
		expect(say.mock.calls[0][1]).toContain('not found');
	});

	test('list random returns no quotes when empty', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		const cmd = await import('../Commands/Information/quote');
		const QuoteMod = await import('../database/models/Quote');
		(QuoteMod.default as any).countDocuments = (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(0) });
		(QuoteMod.default as any).findOne = (jest.fn() as any).mockReturnValue({ skip: (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(null) }) });
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#canadiendragon', 'User', ['list'], 'text', msg);

		expect(say).toHaveBeenCalled();
		expect(say.mock.calls[0][1]).toContain('No quotes found');
	});

	test('list random returns a quote when present', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		const cmd = await import('../Commands/Information/quote');
		const QuoteMod = await import('../database/models/Quote');
		(QuoteMod.default as any).countDocuments = (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue(1) });
		(QuoteMod.default as any).findOne = (jest.fn() as any).mockReturnValue({ skip: (jest.fn() as any).mockReturnValue({ exec: (jest.fn() as any).mockResolvedValue({ _id: '5', content: 'a quote' }) }) });
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#canadiendragon', 'User', ['list'], 'text', msg);

		expect(say).toHaveBeenCalled();
		const called = say.mock.calls.find((c: any[]) => /QuoteID:5/.test(String(c[1])) || /a quote/.test(String(c[1])));
		expect(called).toBeTruthy();
	});
});
