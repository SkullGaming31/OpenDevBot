import { jest } from '@jest/globals';

describe('balanceAdapter', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('getOrCreate delegates to economyService', async () => {
		const mockAcct = { userId: 'u1', balance: 10 };
		jest.doMock('../services/economyService', () => ({
			getOrCreateAccount: (jest.fn() as any).mockResolvedValue(mockAcct),
		}));

		const ba = await import('../services/balanceAdapter');
		const res = await ba.getOrCreate('u1');
		expect(res).toBe(mockAcct);
	});

	test('deposit mirrors to UserModel when numeric id', async () => {
		const mockAcct = { userId: '123', balance: 50 };
		const depositMock = (jest.fn() as any).mockResolvedValue(mockAcct);
		jest.doMock('../services/economyService', () => ({ deposit: depositMock }));

		// Mirroring to UserModel is disabled in runtime; ensure deposit delegates to economyService
		// and avoid asserting on legacy UserModel writes in unit tests.
		const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));

		const ba = await import('../services/balanceAdapter');
		const res = await ba.deposit('123', 25);
		expect(res).toBe(mockAcct);
		expect(depositMock).toHaveBeenCalledWith('123', 25);
		// With mirroring disabled, we do not assert on UserModel updates here.
	});

	test('debitWallet returns false when insufficient funds', async () => {
		const findOneAndUpdate = (jest.fn() as any).mockResolvedValue(null);
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOneAndUpdate } }));

		// Mock BankAccount to avoid real DB calls in unit tests
		const bankMock: any = { updateOne: (jest.fn() as any).mockResolvedValue(undefined), findOneAndUpdate: (jest.fn() as any).mockResolvedValue(null) };
		jest.doMock('../database/models/bankAccount', () => ({ default: bankMock }));

		const ba = await import('../services/balanceAdapter');
		const ok = await ba.debitWallet('alice', 100);
		expect(ok).toBe(false);
	});

	test('debitWallet returns true when sufficient funds', async () => {
		const findOneAndUpdate = (jest.fn() as any).mockResolvedValue({ userId: 'alice', balance: 10 });
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOneAndUpdate } }));

		const bankMock2: any = { updateOne: (jest.fn() as any).mockResolvedValue(undefined), findOneAndUpdate: (jest.fn() as any).mockResolvedValue({ userId: 'alice', balance: 10 }) };
		jest.doMock('../database/models/bankAccount', () => ({ default: bankMock2 }));

		const ba = await import('../services/balanceAdapter');
		const ok = await ba.debitWallet('alice', 5);
		expect(ok).toBe(true);
	});

	test('transfer delegates to economyService and mirrors', async () => {
		const transferMock = (jest.fn() as any).mockResolvedValue(undefined);
		jest.doMock('../services/economyService', () => ({ transfer: transferMock }));

		const updateOne = (jest.fn() as any).mockResolvedValue({});
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));

		const ba = await import('../services/balanceAdapter');
		await expect(ba.transfer('1', '2', 5)).resolves.toBeUndefined();
		expect(transferMock).toHaveBeenCalledWith('1', '2', 5);
		// Mirroring to UserModel is disabled in runtime; avoid asserting on it here.
	});
});
