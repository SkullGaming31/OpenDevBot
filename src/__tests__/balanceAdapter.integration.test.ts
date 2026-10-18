// Ensure any mocks from the unit tests above don't leak into the integration tests
jest.resetModules();
jest.clearAllMocks();

// Load DB modules after resetting the module registry so the adapter uses the SQLite test database.
import { useInMemorySqliteDatabase } from './sqliteTestSetup';

let BankAccount: any;
let adapter: any;

useInMemorySqliteDatabase();

beforeAll(async () => {
  // ensure no mocks are active before loading DB modules
  jest.resetModules();
  jest.clearAllMocks();

  // Dynamically import models and adapter after clearing earlier unit-test mocks.
  const bankMod = await import('../database/models/bankAccount');
  BankAccount = (bankMod && (bankMod.default ?? bankMod));
  adapter = await import('../services/balanceAdapter');
});

beforeEach(async () => {
  await BankAccount.deleteMany({});
});

test('deposit creates a SQLite-backed BankAccount through economyService', async () => {
  await adapter.deposit('12345', 50);
  const acct = await BankAccount.findOne({ userId: '12345' }).lean();
  expect(acct).not.toBeNull();
  expect(acct!.balance.bank).toBe(50);
});

test('debitWallet fails when insufficient funds and succeeds when enough', async () => {
  // create a BankAccount with wallet 20
  await BankAccount.create({ userId: 'u1', username: 'u1', channelId: 'c1', balance: { bank: 0, wallet: 20 } });

  // attempt to debit more than balance
  const fail = await adapter.debitWallet('u1', 30, 'u1', 'c1');
  expect(fail).toBe(false);

  // debit within balance
  const ok = await adapter.debitWallet('u1', 15, 'u1', 'c1');
  expect(ok).toBe(true);

  const acct = await BankAccount.findOne({ userId: 'u1' }).lean();
  expect((acct as any).balance.wallet).toBe(5);
});
