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

		const updateOne = (jest.fn() as any).mockResolvedValue({});
		jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));

		const ba = await import('../services/balanceAdapter');
		const res = await ba.deposit('123', 25);
		expect(res).toBe(mockAcct);
		expect(depositMock).toHaveBeenCalledWith('123', 25);
		expect(updateOne).toHaveBeenCalled();
		const calledWith = updateOne.mock.calls[0][0];
		expect(calledWith).toEqual({ id: '123' });
	});

	test('debitWallet returns false when insufficient funds', async () => {
		const findOneAndUpdate = (jest.fn() as any).mockResolvedValue(null);
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOneAndUpdate } }));

		const ba = await import('../services/balanceAdapter');
		const ok = await ba.debitWallet('alice', 100);
		expect(ok).toBe(false);
	});

	test('debitWallet returns true when sufficient funds', async () => {
		const findOneAndUpdate = (jest.fn() as any).mockResolvedValue({ userId: 'alice', balance: 10 });
		jest.doMock('../database/models/userModel', () => ({ UserModel: { findOneAndUpdate } }));

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
		// expect mirror calls for both from and to
		expect(updateOne.mock.calls.length).toBeGreaterThanOrEqual(2);
	});
});
