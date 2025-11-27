import { jest } from '@jest/globals';

describe('transfer command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('missing args returns usage', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		// prevent importing real userApiClient which can pull in auth/token models
		// make getUserByName truthy so the command reaches the args-check branch
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue({ id: 'u2' }) } }) }));
		const cmd = await import('../Commands/Fun/transfer');
		// text includes recipient so recipient.substring(1) is safe; args empty so usage branch should run
		await cmd.default.execute('#chan', 'User', [], '!transfer @bob', { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } } as any);
		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toContain('Usage');
	});

	test('invalid amount reports error', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		// mock getUserApi to return an object with users.getUserByName
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue({ id: 'u2' }) } }) }));

		const cmd = await import('../Commands/Fun/transfer');
		await cmd.default.execute('#chan', 'User', ['@bob', 'abc'], '!transfer @bob abc', { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } } as any);
		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toContain('please specify a valid amount');
	});

	test('positive amount zero/negative rejected', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue({ id: 'u2' }) } }) }));

		const cmd = await import('../Commands/Fun/transfer');
		await cmd.default.execute('#chan', 'User', ['@bob', '0'], '!transfer @bob 0', { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } } as any);
		expect(say).toHaveBeenCalled();
		expect(String(say.mock.calls[0][1])).toContain('only transfer positive amounts');
	});

	test('successful transfer announces success', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue({ id: 'u2' }) } }) }));
		jest.doMock('../services/balanceAdapter', () => ({ transfer: (jest.fn() as any).mockResolvedValue(undefined) }));

		const cmd = await import('../Commands/Fun/transfer');
		await cmd.default.execute('#chan', 'Alice', ['@bob', '25'], '!transfer @bob 25', { channelId: 'chan', userInfo: { userId: 'u1', userName: 'Alice' } } as any);

		expect(say).toHaveBeenCalled();
		const found = say.mock.calls.find((c: any[]) => /transferred/.test(String(c[1])));
		expect(found).toBeDefined();
		const called = String(found ? found[1] : '');
		expect(called).toContain('transferred 25');
	});

	test('transfer failure reports error', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));
		jest.doMock('../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue({ id: 'u2' }) } }) }));
		jest.doMock('../services/balanceAdapter', () => ({ transfer: (jest.fn() as any).mockRejectedValue(new Error('insufficient')) }));

		const cmd = await import('../Commands/Fun/transfer');
		await cmd.default.execute('#chan', 'Alice', ['@bob', '25'], '!transfer @bob 25', { channelId: 'chan', userInfo: { userId: 'u1', userName: 'Alice' } } as any);

		expect(say).toHaveBeenCalled();
		const foundErr = say.mock.calls.find((c: any[]) => /transfer failed/.test(String(c[1])));
		expect(foundErr).toBeDefined();
		const called = String(foundErr ? foundErr[1] : '');
		expect(called).toContain('insufficient');
	});
});
