/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();
jest.setTimeout(20000);

const sayMockCmd = jest.fn().mockResolvedValue(undefined);

// Mock the chat client without importing the real module to avoid side-effects
jest.doMock('../../chat', () => ({
  getChatClient: jest.fn().mockResolvedValue({ say: sayMockCmd }),
}));

describe('lurk command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a lurk doc with displayNameLower when used with a message', async () => {
    // prepare DB mock: no existing doc
    const findOneMock = jest.fn().mockResolvedValue(null);
    const countMock = jest.fn().mockResolvedValue(1);
    const saveMock = jest.fn().mockResolvedValue(undefined);
    const LurkMessageModel = jest.fn().mockImplementation((doc: any) => ({ ...doc, save: saveMock }));
    (LurkMessageModel as any).findOne = findOneMock;
    (LurkMessageModel as any).countDocuments = countMock;

    jest.doMock('../../database/models/LurkModel', () => ({ LurkMessageModel }));

    const lurkModule = await import('../../Commands/Information/lurk');
    const cmd = lurkModule.default as any;

    // clear state
    lurkModule.lurkingUsers.clear();

    const fakeMsg: any = { userInfo: { userId: 'u-100', displayName: 'Tester' } };

    await cmd.execute('canadiendragon', 'tester', ['on', 'hello', 'world'], '!lurk on hello world', fakeMsg);

    const mocked = (await import('../../database/models/LurkModel')) as any;
    expect(mocked.LurkMessageModel).toHaveBeenCalled();
    const createdArg = mocked.LurkMessageModel.mock.calls[0][0];
    expect(createdArg).toMatchObject({ id: 'u-100', displayName: 'Tester', displayNameLower: 'tester', message: 'hello world' });
    expect(lurkModule.lurkingUsers.has('tester')).toBe(true);
    expect(sayMockCmd).toHaveBeenCalledWith('canadiendragon', 'tester is now lurking with the message: hello world');
  });

  it('creates/updates lurk doc when used without a message', async () => {
    const findOneMock = jest.fn().mockResolvedValue(null);
    const countMock = jest.fn().mockResolvedValue(1);
    const saveMock = jest.fn().mockResolvedValue(undefined);
    const LurkMessageModel = jest.fn().mockImplementation((doc: any) => ({ ...doc, save: saveMock }));
    (LurkMessageModel as any).findOne = findOneMock;
    (LurkMessageModel as any).countDocuments = countMock;

    jest.doMock('../../database/models/LurkModel', () => ({ LurkMessageModel }));

    const lurkModule = await import('../../Commands/Information/lurk');
    const cmd = lurkModule.default as any;

    lurkModule.lurkingUsers.clear();

    const fakeMsg: any = { userInfo: { userId: 'u-101', displayName: 'NoMsgUser' } };

    await cmd.execute('canadiendragon', 'nomsguser', ['on'], '!lurk on', fakeMsg);

    const mocked = (await import('../../database/models/LurkModel')) as any;
    expect(mocked.LurkMessageModel).toHaveBeenCalled();
    const createdArg = mocked.LurkMessageModel.mock.calls[0][0];
    expect(createdArg).toMatchObject({ id: 'u-101', displayName: 'NoMsgUser', displayNameLower: 'nomsguser', message: '' });
    expect(lurkModule.lurkingUsers.has('nomsguser')).toBe(true);
    expect(sayMockCmd).toHaveBeenCalledWith('canadiendragon', expect.stringContaining('is now lurking'));
  });

  it('removes user and deletes saved doc on off', async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const findOneMock = jest.fn().mockResolvedValue({ deleteOne: deleteMock });
    const countMock = jest.fn().mockResolvedValue(1);
    const LurkMessageModel = jest.fn().mockImplementation(() => ({}));
    (LurkMessageModel as any).findOne = findOneMock;
    (LurkMessageModel as any).countDocuments = countMock;

    jest.doMock('../../database/models/LurkModel', () => ({ LurkMessageModel }));

    const lurkModule = await import('../../Commands/Information/lurk');
    const cmd = lurkModule.default as any;

    // pre-populate
    lurkModule.lurkingUsers.clear();
    lurkModule.lurkingUsers.add('tooff');

    const fakeMsg: any = { userInfo: { userId: 'u-102', displayName: 'ToOff' } };

    await cmd.execute('canadiendragon', 'tooff', ['off'], '!lurk off', fakeMsg);

    expect(lurkModule.lurkingUsers.has('tooff')).toBe(false);
    expect(sayMockCmd).toHaveBeenCalledWith('canadiendragon', 'ToOff is no longer lurking');
    const mocked = (await import('../../database/models/LurkModel')) as any;
    expect(mocked.LurkMessageModel.findOne).toHaveBeenCalledWith({ id: 'u-102' });
  });
});
