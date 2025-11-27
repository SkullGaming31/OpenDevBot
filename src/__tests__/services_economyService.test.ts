import { jest } from '@jest/globals';

describe('economyService', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		// Prevent loading real marketplaceItem model (it expects mongoose.Types etc.)
		jest.doMock('../database/models/marketplaceItem', () => ({
			findOne: (jest.fn() as any),
			findOneAndDelete: (jest.fn() as any),
			find: (jest.fn() as any),
		}));
	});

	test('deposit non-transactional succeeds and returns account', async () => {
		const returned = { userId: 'u1', balance: 60 };
		const findOneAndUpdate = (jest.fn() as any).mockReturnValue({ lean: (jest.fn() as any).mockResolvedValue(returned) });
		const create = (jest.fn() as any).mockResolvedValue([]);

		jest.doMock('../database/models/bankAccount', () => ({ findOneAndUpdate }));
		jest.doMock('../database/models/transactionLog', () => ({ create }));
		// Ensure no transactions supported by default
		jest.doMock('mongoose', () => ({ connection: { db: null } }));

		const svc = await import('../services/economyService');
		const res = await svc.deposit('u1', 50);
		expect(res).toBeDefined();
		expect(findOneAndUpdate).toHaveBeenCalled();
		expect(create).toHaveBeenCalled();
	});

	test('deposit rejects non-positive amounts', async () => {
		jest.doMock('mongoose', () => ({ connection: { db: null } }));
		jest.doMock('../database/models/bankAccount', () => ({ findOneAndUpdate: jest.fn() }));
		jest.doMock('../database/models/transactionLog', () => ({ create: jest.fn() }));

		const svc = await import('../services/economyService');
		await expect(svc.deposit('u1', 0)).rejects.toThrow();
		await expect(svc.deposit('u1', -5)).rejects.toThrow();
	});

	test('withdraw non-transactional throws on insufficient funds', async () => {
		const findOneAndUpdate = (jest.fn() as any).mockReturnValue({ lean: (jest.fn() as any).mockResolvedValue(null) });
		jest.doMock('../database/models/bankAccount', () => ({ findOneAndUpdate }));
		jest.doMock('../database/models/transactionLog', () => ({ create: jest.fn() }));
		jest.doMock('mongoose', () => ({ connection: { db: null } }));

		const svc = await import('../services/economyService');
		await expect(svc.withdraw('u1', 100)).rejects.toThrow(/Insufficient/);
	});

	test('transfer fallback path succeeds', async () => {
		// Setup non-transactional path (no replset support)
		const dec = (jest.fn() as any).mockResolvedValue({ userId: 'from', balance: 50 });
		const cred = (jest.fn() as any).mockResolvedValue({ userId: 'to', balance: 60 });
		const create = (jest.fn() as any).mockResolvedValue([]);

		jest.doMock('../database/models/bankAccount', () => ({ findOneAndUpdate: jest.fn() }
		));

		// We need findOneAndUpdate to behave differently for the two calls. We'll mock the module with functions
		jest.doMock('../database/models/bankAccount', () => ({
			findOneAndUpdate: (jest.fn() as any).mockImplementation((query: any) => {
				// first call is decrement (from), second is credit (to)
				if (query && query.userId === 'from') return Promise.resolve({ userId: 'from', balance: 40 });
				return Promise.resolve({ userId: 'to', balance: 60 });
			})
		}));

		jest.doMock('../database/models/transactionLog', () => ({ create }));
		jest.doMock('mongoose', () => ({ connection: { db: null } }));

		const svc = await import('../services/economyService');
		await expect(svc.transfer('from', 'to', 5)).resolves.toBeUndefined();
		expect(create).toHaveBeenCalled();
	});

	test('listMarketplace returns items from MarketplaceItem.find', async () => {
		const items = [{ itemId: 'i1', price: 10 }];
		const find = (jest.fn() as any).mockReturnValue({ lean: (jest.fn() as any).mockResolvedValue(items) });
		jest.doMock('../database/models/marketplaceItem', () => ({ find }));
		jest.doMock('mongoose', () => ({ connection: { db: null } }));

		const svc = await import('../services/economyService');
		const res = await svc.listMarketplace();
		expect(res).toBe(items);
		expect(find).toHaveBeenCalled();
	});
});
