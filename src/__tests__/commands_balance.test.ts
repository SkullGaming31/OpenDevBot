import { jest } from '@jest/globals';

describe('balance command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('balance forwards to bank message', async () => {
		const say = jest.fn();
		jest.doMock('../chat', () => ({ getChatClient: async () => ({ say }) }));

		const cmd = await import('../Commands/Fun/balance');
		await cmd.default.execute('#chan', 'User', [], '', { channelId: 'chan', userInfo: { userId: 'u1', userName: 'User' } } as any);

		expect(say).toHaveBeenCalled();
		const called = String(say.mock.calls[0][1]);
		expect(called).toContain('the !balance command has moved');
	});
});
