jest.setTimeout(10000);

describe('duel command (unit)', () => {
	beforeEach(() => jest.resetModules());

	test('debits challenger and transfers on win (auto-accept)', async () => {
		// Prepare mocks before loading the duel module
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue({ say: jest.fn() }) }));
		jest.doMock('../services/balanceAdapter', () => ({
			getOrCreate: jest.fn().mockResolvedValue({ userId: 'opponent', balance: 100 }),
			debitWallet: jest.fn().mockResolvedValue(true),
			transfer: jest.fn().mockResolvedValue({}),
		}));

		// Mock sleep to auto-accept the duel by calling acceptDuel on the module when sleep is awaited
		jest.doMock('../util/util', () => ({
			sleep: async (ms: number) => {
				// require the duel module and accept the pending duel for '@opponent' (the implementation keeps the @)
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const duelMod = require('../Commands/Fun/duel');
				if (duelMod && typeof duelMod.acceptDuel === 'function') {
					duelMod.acceptDuel('@opponent');
				}
				return Promise.resolve();
			}
		}));

		// Now import the duel module (with mocks applied)
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const duelModule = require('../Commands/Fun/duel');
		const duelCommand = duelModule.default;
		const balanceAdapter = require('../services/balanceAdapter');

		const channel = '#test';
		const user = 'challenger';
		const args = ['@opponent', '10'];
		const text = '!duel @opponent 10';
		const msg: any = { userInfo: { userId: '111', userName: 'challenger', displayName: 'Challenger' }, channelId: '1' };

		await duelCommand.execute(channel, user, args, text, msg);

		expect(balanceAdapter.debitWallet).toHaveBeenCalled();
		expect(balanceAdapter.transfer).toHaveBeenCalled();
	});
});
