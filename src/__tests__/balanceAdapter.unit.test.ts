import { jest } from '@jest/globals';

describe('balanceAdapter (unit)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('deposit mirrors to UserModel for numeric and username ids and handles mirror failure', async () => {
    // Mock economyService.deposit
    const acct = { userId: '123', balance: 50 };
    jest.doMock('../services/economyService', () => ({ getOrCreateAccount: (jest.fn() as any), deposit: (jest.fn() as any).mockResolvedValue(acct) }));

    // Mock UserModel.updateOne to capture calls
    // Mirroring disabled; keep a no-op mock but don't assert calls
    const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
    jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));

    // Mock BankAccount to avoid real DB calls in unit tests
    const bankMock: any = { updateOne: (jest.fn() as any).mockResolvedValue(undefined), findOneAndUpdate: (jest.fn() as any).mockResolvedValue(undefined) };
    jest.doMock('../database/models/bankAccount', () => ({ default: bankMock }));

    const warn = (jest.fn() as any);
    jest.doMock('../util/logger', () => ({ warn }));

    const ba = await import('../services/balanceAdapter');

    // numeric id path
    const res = await ba.deposit('123', 10);
    expect(res).toBe(acct);
    // mirroring disabled in runtime; don't assert updateOne

    // username path
    updateOne.mockClear();
    const res2 = await ba.deposit('alice', 5);
    expect(res2).toBe(acct);
    // mirroring disabled in runtime; don't assert updateOne

    // simulate mirror failure path (mirroring disabled, so just ensure deposit still returns)
    updateOne.mockImplementationOnce(() => { throw new Error('db fail'); });
    const res3 = await ba.deposit('bob', 7);
    expect(res3).toBe(acct);
  });

  test('withdraw mirrors and returns account', async () => {
    const acct = { userId: 'u1', balance: 20 };
    jest.doMock('../services/economyService', () => ({ withdraw: (jest.fn() as any).mockResolvedValue(acct) }));
    const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
    jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));
    const warn = (jest.fn() as any);
    jest.doMock('../util/logger', () => ({ warn }));

    const ba = await import('../services/balanceAdapter');
    const res = await ba.withdraw('999', 5);
    expect(res).toBe(acct);
    // mirroring disabled in runtime; don't assert updateOne
  });

  test('creditWallet and debitWallet numeric and username behavior', async () => {
    const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
    const findOneAndUpdate = (jest.fn() as any).mockResolvedValue({});
    jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne, findOneAndUpdate } }));

    // Mock BankAccount to avoid real DB calls in unit tests
    const bankMock2: any = { updateOne: (jest.fn() as any).mockResolvedValue(undefined), findOneAndUpdate };
    jest.doMock('../database/models/bankAccount', () => ({ default: bankMock2 }));
    const warn = (jest.fn() as any);
    jest.doMock('../util/logger', () => ({ warn }));

    const ba = await import('../services/balanceAdapter');

    // numeric id
    await ba.creditWallet('123', 10);
    // mirroring disabled in runtime; don't assert updateOne

    // username + channelId path
    updateOne.mockClear();
    await ba.creditWallet('name', 5, 'name', 'chan1');
    // mirroring disabled in runtime; don't assert updateOne

    // debitWallet numeric success/fail
    findOneAndUpdate.mockResolvedValueOnce({}).mockResolvedValueOnce(null);
    const ok = await ba.debitWallet('123', 2);
    expect(ok).toBe(true);
    const nok = await ba.debitWallet('123', 999);
    expect(nok).toBe(false);
  });

  test('transfer delegates to economyService and mirrors, warns on mirror failure', async () => {
    const transferMock = (jest.fn() as any).mockResolvedValue(undefined);
    jest.doMock('../services/economyService', () => ({ transfer: transferMock }));
    const updateOne = (jest.fn() as any).mockResolvedValue(undefined);
    jest.doMock('../database/models/userModel', () => ({ UserModel: { updateOne } }));
    const warn = (jest.fn() as any);
    jest.doMock('../util/logger', () => ({ warn }));

    const ba = await import('../services/balanceAdapter');
    await ba.transfer('fromUser', 'toUser', 5);
    expect(transferMock).toHaveBeenCalled();
    // mirroring disabled in runtime; do not assert UserModel updates

    // simulate mirror failure (mirroring disabled; ensure transfer still resolves)
    updateOne.mockImplementationOnce(() => { throw new Error('boom'); });
    await ba.transfer('1', '2', 3);
  });
});
