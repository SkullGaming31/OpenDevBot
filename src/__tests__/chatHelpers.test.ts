describe('chat helpers', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('getUsernamesFromDatabase returns logins', async () => {
		const tokens = [{ login: 'one' }, { login: 'two' }];
		const TokenModel = { find: jest.fn().mockResolvedValue(tokens) } as any;
		jest.doMock('../database/models/tokenModel', () => ({ TokenModel }));
		const { getUsernamesFromDatabase } = await import('../chat');
		const res = await getUsernamesFromDatabase();
		expect(res).toEqual(['one', 'two']);
	});

	test('getUsernamesFromDatabase throws on DB error', async () => {
		const TokenModel = { find: jest.fn().mockRejectedValue(new Error('fail')) } as any;
		jest.doMock('../database/models/tokenModel', () => ({ TokenModel }));
		const { getUsernamesFromDatabase } = await import('../chat');
		await expect(getUsernamesFromDatabase()).rejects.toThrow('fail');
	});
});
