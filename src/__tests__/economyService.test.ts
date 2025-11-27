import { jest } from '@jest/globals';

describe('economyService (non-transactional paths)', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('deposit throws on non-positive amount and performs upsert increment', async () => {
		// mock BankAccount.findOneAndUpdate and TransactionLog before importing the service
		const mockAcct: any = { userId: 'u1', balance: 100 };
		const bankMock: any = { findOneAndUpdate: (jest.fn() as any).mockReturnValue({ lean: (jest.fn() as any).mockResolvedValue(mockAcct) }) };
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };
		jest.doMock('../database/models/bankAccount', () => ({ default: bankMock, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { deposit, EconomyError } = svc as any;

		await expect(deposit('u1', 0)).rejects.toBeInstanceOf(EconomyError);

		const res = await deposit('u1', 50);
		expect(bankMock.findOneAndUpdate).toHaveBeenCalled();
		expect(tlMock.create).toHaveBeenCalled();
		expect(res).toBe(mockAcct);
	});

	test('withdraw throws on insufficient funds and succeeds when sufficient', async () => {
		// mock DB models before importing service
		const bankMock: any = {
			findOneAndUpdate: (jest.fn() as any)
			// first call simulate insufficient funds -> return object with lean -> resolves null
				.mockReturnValueOnce({ lean: (jest.fn() as any).mockResolvedValueOnce(null) })
			// second call simulate success -> .lean resolves account
				.mockReturnValueOnce({ lean: (jest.fn() as any).mockResolvedValueOnce({ userId: 'u1', balance: 20 }) }),
		};
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };
		jest.doMock('../database/models/bankAccount', () => ({ default: bankMock, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { withdraw, EconomyError } = svc as any;

		await expect(withdraw('u1', 0)).rejects.toBeInstanceOf(EconomyError);

		await expect(withdraw('u1', 50)).rejects.toBeInstanceOf(EconomyError);

		const ok = await withdraw('u1', 10);
		expect(bankMock.findOneAndUpdate).toHaveBeenCalled();
		expect(tlMock.create).toHaveBeenCalled();
		expect(ok).toEqual({ userId: 'u1', balance: 20 });
	});

	test('transfer fallback path decrements and credits accounts', async () => {
		// force transactionsSupported() to return false by making mongoose.admin command throw
		const mongooseMock: any = {
			connection: { db: { admin: () => ({ command: async () => { throw new Error('no replset'); } }) } },
			startSession: jest.fn(),
		};

		const dec = { userId: 'from', balance: 50 };
		const cred = { userId: 'to', balance: 30 };

		const bankMock: any = {
			findOneAndUpdate: (jest.fn() as any)
			// first call for dec: returns dec (sufficient funds)
				.mockResolvedValueOnce(dec)
			// second call for cred: returns cred
				.mockResolvedValueOnce(cred),
		};
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		// use real mongoose module but override connection.db.admin.command to throw so transactionsSupported() returns false
		const realMongoose = await import('mongoose');
		(realMongoose as any).connection = { db: { admin: () => ({ command: async () => { throw new Error('no replset'); } }) } };
		jest.doMock('../database/models/bankAccount', () => ({ default: bankMock, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { transfer } = svc as any;
		await expect(transfer('from', 'to', 10)).resolves.toBeUndefined();
		expect(bankMock.findOneAndUpdate).toHaveBeenCalledTimes(2);
		expect(tlMock.create).toHaveBeenCalled();
	});

	test('getOrCreateAccount returns existing or creates new account', async () => {
		jest.resetModules();

		const existing = { userId: 'ex', balance: 5 };
		const findOneMock = (jest.fn() as any).mockResolvedValueOnce(existing).mockResolvedValueOnce(null);

		function BankAccount(this: any, data: any) {
			Object.assign(this, data);
			this.save = (jest.fn() as any).mockResolvedValue(this);
		}
		(BankAccount as any).findOne = findOneMock;

		jest.doMock('../database/models/bankAccount', () => ({ default: BankAccount as any, __esModule: true }));

		const svc = await import('../services/economyService');
		const { getOrCreateAccount } = svc as any;

		const got1 = await getOrCreateAccount('ex');
		expect(got1).toBe(existing);

		const got2 = await getOrCreateAccount('new');
		expect(got2).toBeDefined();
	});

	test('buyItem transactional path: item not found and success path', async () => {
		jest.resetModules();

		// fake session
		const sessionMock: any = {
			startTransaction: jest.fn(),
			commitTransaction: (jest.fn() as any).mockResolvedValue(undefined),
			abortTransaction: (jest.fn() as any).mockResolvedValue(undefined),
			endSession: jest.fn(),
		};
		const mongooseMock: any = {
			startSession: jest.fn().mockReturnValue(sessionMock),
			connection: { db: { admin: () => ({ command: async () => ({ ok: 1 }) }) } },
		};

		const mItemMock: any = { findOne: jest.fn().mockReturnValue({ session: (_s: any) => Promise.resolve(null) }) };
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		jest.doMock('mongoose', () => mongooseMock);
		jest.doMock('../database/models/marketplaceItem', () => ({ default: mItemMock, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { buyItem, EconomyError } = svc as any;

		await expect(buyItem('b', 'nope')).rejects.toBeInstanceOf(EconomyError);

		// Now test success: make findOne return an item and spy on withdraw/deposit
		jest.resetModules();
		const sessionMock2: any = {
			startTransaction: jest.fn(),
			commitTransaction: (jest.fn() as any).mockResolvedValue(undefined),
			abortTransaction: (jest.fn() as any).mockResolvedValue(undefined),
			endSession: jest.fn(),
		};
		const mongooseMock2: any = {
			startSession: jest.fn().mockReturnValue(sessionMock2),
			connection: { db: { admin: () => ({ command: async () => ({ ok: 1 }) }) } },
		};
		const item = { itemId: 'i2', price: 5, sellerId: 's1', deleteOne: (jest.fn() as any).mockResolvedValue(undefined) };
		const mItemMock2: any = { findOne: jest.fn().mockReturnValue({ session: (_s: any) => Promise.resolve(item) }) };
		const tlMock2: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		// Mock BankAccount so internal withdraw/deposit calls during the transactional flow work
		const buyerAcct = { userId: 'buyer', balance: 100, save: (jest.fn() as any).mockResolvedValue(undefined) };
		const sellerAcct = { userId: 's1', balance: 0, save: (jest.fn() as any).mockResolvedValue(undefined) };
		const BankAccountMock: any = {};
		BankAccountMock.findOne = jest.fn().mockImplementation(({ userId }: any) => ({ session: (_s: any) => Promise.resolve(userId === 'buyer' ? buyerAcct : sellerAcct) }));

		jest.doMock('mongoose', () => mongooseMock2);
		jest.doMock('../database/models/marketplaceItem', () => ({ default: mItemMock2, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock2, __esModule: true }));
		jest.doMock('../database/models/bankAccount', () => ({ default: BankAccountMock, __esModule: true }));

		const svc2 = await import('../services/economyService');

		const res = await svc2.buyItem('buyer', 'i2');
		expect(res).toEqual({ success: true });
		expect(mItemMock2.findOne).toHaveBeenCalled();
		expect(item.deleteOne).toHaveBeenCalled();
		expect(tlMock2.create).toHaveBeenCalled();
	});

	test('transfer rejects non-positive amounts', async () => {
		jest.resetModules();
		const svc = await import('../services/economyService');
		const { transfer, EconomyError } = svc as any;
		await expect(transfer('a', 'b', 0)).rejects.toBeInstanceOf(EconomyError);
	});

	test('listMarketplace and buyItem fallback (success and failure)', async () => {
		const items = [{ itemId: 'i1', price: 5, sellerId: 's1' }];

		const mItemMock: any = {
			find: (jest.fn() as any).mockReturnValue({ lean: (jest.fn() as any).mockResolvedValue(items) }),
			findOne: (jest.fn() as any).mockResolvedValue(items[0]),
			findOneAndDelete: (jest.fn() as any).mockResolvedValue(items[0]),
		};

		const bankMock: any = {
			findOneAndUpdate: (jest.fn() as any)
			// buyer debit -> succeeds
				.mockResolvedValueOnce({ userId: 'b', balance: 10 })
			// refund / credit seller calls (we won't reach refund in success)
				.mockResolvedValueOnce({ userId: 's1', balance: 15 }),
		};
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		jest.doMock('../database/models/marketplaceItem', () => ({ default: mItemMock, __esModule: true }));
		jest.doMock('../database/models/bankAccount', () => ({ default: bankMock, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		// Ensure transactions are unsupported so the fallback code path is taken
		jest.doMock('mongoose', () => ({ connection: { db: { admin: () => ({ command: async () => { throw new Error('no replset'); } }) } } }));

		const svc = await import('../services/economyService');

		const list = await svc.listMarketplace();
		expect(list).toBe(items);

		const res = await svc.buyItem('b', 'i1');
		expect(res).toEqual({ success: true });
		expect(bankMock.findOneAndUpdate).toHaveBeenCalled();
		expect(mItemMock.findOneAndDelete).toHaveBeenCalled();
		expect(tlMock.create).toHaveBeenCalled();
	});

	test('deposit using a provided session (transactional create-account path)', async () => {
		jest.resetModules();
		// Mock BankAccount as a constructor plus static findOne that supports .session(session)
		const savedAccounts: any[] = [];
		function BankAccount(this: any, data: any) {
			Object.assign(this, data);
			this.save = (jest.fn() as any).mockImplementation(async (opts: any) => {
				savedAccounts.push(this);
				return this;
			});
		}
		const findOneMock = jest.fn().mockReturnValueOnce({ session: (_s: any) => Promise.resolve(null) });

		(BankAccount as any).findOne = findOneMock;
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		jest.doMock('../database/models/bankAccount', () => ({ default: BankAccount as any, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { deposit } = svc as any;

		const fakeSession = {};
		const depRes = await deposit('u1', 25, fakeSession);
		expect(findOneMock).toHaveBeenCalled();
		expect(savedAccounts.length).toBeGreaterThanOrEqual(1);
		expect(tlMock.create).toHaveBeenCalled();
	});

	test('withdraw using a provided session (transactional insufficient and success paths)', async () => {
		jest.resetModules();
		const acctExisting = { userId: 'u2', balance: 100, save: (jest.fn() as any).mockResolvedValue(undefined) };
		const findOneMock = jest.fn().mockReturnValue({ session: (_s: any) => Promise.resolve(acctExisting) });
		const BankAccount: any = function () { /* constructor not used here */ };
		BankAccount.findOne = findOneMock;
		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		jest.doMock('../database/models/bankAccount', () => ({ default: BankAccount, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { withdraw, EconomyError } = svc as any;

		const fakeSession = {};
		await expect(withdraw('u2', 200, fakeSession)).rejects.toBeInstanceOf(EconomyError);
		const ok = await withdraw('u2', 50, fakeSession);
		expect(ok).toBeDefined();
		expect(tlMock.create).toHaveBeenCalled();
	});

	test('transfer uses transactions when supported (start/commit/abort paths)', async () => {
		jest.resetModules();

		// create a fake session object we can assert against
		const sessionMock: any = {
			startTransaction: jest.fn(),
			commitTransaction: (jest.fn() as any).mockResolvedValue(undefined),
			abortTransaction: (jest.fn() as any).mockResolvedValue(undefined),
			endSession: jest.fn(),
		};

		// Mock mongoose with startSession returning our session and admin.command succeeding
		const mongooseMock: any = {
			startSession: jest.fn().mockReturnValue(sessionMock),
			connection: { db: { admin: () => ({ command: async () => ({ ok: 1 }) }) } },
		};

		// BankAccount.findOne should return an account for withdraw, and for deposit return null to exercise new-account creation
		function BankAccount(this: any, data: any) {
			Object.assign(this, data);
			this.save = (jest.fn() as any).mockResolvedValue(this);
		}
		const acctFrom = { userId: 'from', balance: 100, save: (jest.fn() as any).mockResolvedValue(undefined) };
		const findOneMock = jest.fn()
			.mockReturnValueOnce({ session: (_s: any) => Promise.resolve(acctFrom) })
			.mockReturnValueOnce({ session: (_s: any) => Promise.resolve(null) });
		(BankAccount as any).findOne = findOneMock;

		const tlMock: any = { create: (jest.fn() as any).mockResolvedValue(undefined) };

		// Mock modules before importing service
		jest.doMock('mongoose', () => mongooseMock);
		jest.doMock('../database/models/bankAccount', () => ({ default: BankAccount as any, __esModule: true }));
		jest.doMock('../database/models/transactionLog', () => ({ default: tlMock, __esModule: true }));

		const svc = await import('../services/economyService');
		const { transfer } = svc as any;

		await expect(transfer('from', 'to', 10)).resolves.toBeUndefined();
		expect(mongooseMock.startSession).toHaveBeenCalled();
		expect(sessionMock.startTransaction).toHaveBeenCalled();
		expect(sessionMock.commitTransaction).toHaveBeenCalled();
		expect(sessionMock.endSession).toHaveBeenCalled();
		expect(tlMock.create).toHaveBeenCalled();
	});
});
