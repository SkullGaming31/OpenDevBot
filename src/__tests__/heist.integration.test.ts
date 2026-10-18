import { useInMemorySqliteDatabase } from './sqliteTestSetup';

jest.setTimeout(20000);
useInMemorySqliteDatabase();

describe('heist integration (SQLite)', () => {
	beforeEach(() => {
		process.env.ENVIRONMENT = 'dev';
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	test('a bank heist debits donors and credits the winner using SQLite models', async () => {
		const BankAccount = (await import('../database/models/bankAccount')).default;
		const TransactionLog = (await import('../database/models/transactionLog')).default;
		await BankAccount.create({
			userId: 'initiator',
			username: 'initiator',
			balance: { bank: 0, wallet: 5100 }
		});
		for (let i = 1; i <= 5; i++) {
			await BankAccount.create({
				userId: `donor${i}`,
				username: `donor${i}`,
				balance: { bank: 5000, wallet: 0 }
			});
		}

		const chatClient = {
			say: jest.fn().mockResolvedValue(undefined),
			onMessage: jest.fn()
		};
		jest.doMock('../chat', () => ({ getChatClient: jest.fn().mockResolvedValue(chatClient) }));
		jest.doMock('../database/models/injury', () => ({
			InjuryModel: {
				find: () => ({ lean: () => ({ exec: async () => [] }) }),
				findOneAndUpdate: jest.fn().mockResolvedValue({})
			}
		}));
		jest.doMock('crypto', () => ({
			...jest.requireActual('crypto'),
			randomInt: jest.fn(() => 1)
		}));

		const heistModule = await import('../Commands/Fun/heist');
		const execution = heistModule.default.execute(
			'chan',
			'initiator',
			['5000', 'bank'],
			'',
			{ channelId: 'chan', userInfo: { userId: 'initiator', userName: 'initiator' } } as any
		);

		await jest.advanceTimersByTimeAsync(11000);
		await execution;

		const withdrawals = await TransactionLog.find({ type: 'withdraw' }).lean();
		const deposits = await TransactionLog.find({ type: 'deposit' }).lean();
		expect(withdrawals.length).toBeGreaterThan(0);
		expect(deposits.length).toBeGreaterThan(0);
		expect(chatClient.say).toHaveBeenCalledWith('chan', expect.stringContaining('The heist was successful!'));
	});
});
