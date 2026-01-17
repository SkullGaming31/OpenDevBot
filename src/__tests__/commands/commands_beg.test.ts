import { jest } from '@jest/globals';

describe('beg command', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('cooldown path informs user to wait', async () => {
		const say = jest.fn();
		jest.doMock('../../chat', () => ({ getChatClient: async () => ({ say }) }));
		// avoid loading real userApiClient/authProvider which touch tokens/mongoose
		jest.doMock('../../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue(undefined) } }) }));

		// mock UserModel so we don't load mongoose in tests
		jest.doMock('../../database/models/userModel', () => ({
			UserModel: {
				findOne: (jest.fn() as any).mockResolvedValue({ lastBegTime: new Date() }),
			}
		}));

		const cmd = await import('../../Commands/Fun/beg');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#chan', 'User', [], '', msg);

		expect(say).toHaveBeenCalled();
		const called = String(say.mock.calls[0][1]);
		expect(called).toMatch(/you must wait/i);
	});

	test('successful beg credits wallet and announces', async () => {
		const say = jest.fn();
		jest.doMock('../../chat', () => ({ getChatClient: async () => ({ say }) }));
		// avoid loading real userApiClient/authProvider which touch tokens/mongoose
		jest.doMock('../../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue(undefined) } }) }));

		// mock UserModel to avoid mongoose
		jest.doMock('../../database/models/userModel', () => ({
			UserModel: {
				findOne: (jest.fn() as any).mockResolvedValue(null),
				updateOne: (jest.fn() as any).mockResolvedValue(undefined)
			}
		}));

		// mock crypto.randomInt for success, amount, and selection
		jest.doMock('crypto', () => ({ randomInt: (jest.fn() as any).mockReturnValueOnce(1).mockReturnValueOnce(10).mockReturnValueOnce(0) }));

		// mock balanceAdapter.creditWallet
		jest.doMock('../../services/balanceAdapter', () => ({ creditWallet: (jest.fn() as any).mockResolvedValue(undefined) }));

		const cmd = await import('../../Commands/Fun/beg');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#chan', 'User', [], '!beg', msg);

		// creditWallet should have been called with amount 10
		const bal = await import('../../services/balanceAdapter');
		expect((bal as any).creditWallet).toHaveBeenCalled();
		expect(say).toHaveBeenCalled();
		const found = say.mock.calls.find((c: any[]) => /Gold/.test(String(c[1])));
		expect(found).toBeDefined();
		const announced = String(found ? found[1] : '');
		expect(announced).toMatch(/Gold/);
	});

	test('failed beg announces failure and does not credit', async () => {
		const say = jest.fn();
		jest.doMock('../../chat', () => ({ getChatClient: async () => ({ say }) }));
		// avoid loading real userApiClient/authProvider which touch tokens/mongoose
		jest.doMock('../../api/userApiClient', () => ({ getUserApi: async () => ({ users: { getUserByName: (jest.fn() as any).mockReturnValue(undefined) } }) }));

		jest.doMock('../../database/models/userModel', () => ({
			UserModel: {
				findOne: (jest.fn() as any).mockResolvedValue(null)
			}
		}));

		// force failure (randomInt > success threshold)
		jest.doMock('crypto', () => ({ randomInt: (jest.fn() as any).mockReturnValue(99) }));
		jest.doMock('../../services/balanceAdapter', () => ({ creditWallet: (jest.fn() as any) }));

		const cmd = await import('../../Commands/Fun/beg');
		const msg: any = { channelId: 'chan', userInfo: { userId: 'u1', userName: 'u1' } };

		await cmd.default.execute('#chan', 'User', [], '!beg', msg);

		const bal = await import('../../services/balanceAdapter');
		expect((bal as any).creditWallet).not.toHaveBeenCalled();
		expect(say).toHaveBeenCalled();
	});
});
