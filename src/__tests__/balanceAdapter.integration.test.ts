// Ensure any mocks from the unit tests above don't leak into the integration tests
jest.resetModules();
jest.clearAllMocks();

// Integration tests (real mongodb) — load DB modules after resetting module registry
let mongod: any;
let mongoose: any;
let BankAccount: any;
let UserModel: any;
let adapter: any;

beforeAll(async () => {
  // ensure no mocks are active before loading DB modules
  jest.resetModules();
  jest.clearAllMocks();

  mongoose = await import('mongoose');
  const mms = await import('mongodb-memory-server');
  const MongoMemoryServer = (mms && (mms.MongoMemoryServer ?? mms.default?.MongoMemoryServer)) || mms.MongoMemoryServer || mms.default;
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Dynamically import models and adapter so earlier unit-test mocks don't leak in
  const bankMod = await import('../database/models/bankAccount');
  BankAccount = (bankMod && (bankMod.default ?? bankMod));
  const userMod = await import('../database/models/userModel');
  UserModel = userMod.UserModel ?? userMod;
  adapter = await import('../services/balanceAdapter');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await BankAccount.deleteMany({});
  await UserModel.deleteMany({});
});

test('deposit mirrors to UserModel and creates BankAccount via economyService', async () => {
  // deposit into bank which should also mirror to UserModel
  await adapter.deposit('12345', 50);

  const user = await UserModel.findOne({ id: '12345' }).lean();
  expect(user).not.toBeNull();
  expect(user!.balance).toBe(50);

  const acct = await BankAccount.findOne({ userId: '12345' }).lean();
  expect(acct).not.toBeNull();
  expect(acct!.balance.bank).toBe(50);
});

test('debitWallet fails when insufficient funds and succeeds when enough', async () => {
  // create a user with 20 balance
  await UserModel.create({ id: 'u1', username: 'u1', channelId: 'c1', balance: 20 });

  // attempt to debit more than balance
  const fail = await adapter.debitWallet('u1', 30, 'u1', 'c1');
  expect(fail).toBe(false);

  // debit within balance
  const ok = await adapter.debitWallet('u1', 15, 'u1', 'c1');
  expect(ok).toBe(true);

  const user = await UserModel.findOne({ id: 'u1' }).lean();
  expect(user!.balance).toBe(5);
});
