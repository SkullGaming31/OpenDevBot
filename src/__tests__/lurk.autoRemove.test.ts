/* eslint-disable @typescript-eslint/no-explicit-any */
jest.resetModules();

const sayMock = jest.fn().mockResolvedValue(undefined);
const onMessageMock = jest.fn();
const deleteOneMock = jest.fn().mockResolvedValue({});

jest.doMock('../database/models/LurkModel', () => ({
  LurkMessageModel: {
    deleteOne: deleteOneMock,
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

// Preserve other exports from the real module but mock `getChatClient`
const actualChat = jest.requireActual('../chat');
jest.doMock('../chat', () => ({
  ...actualChat,
  getChatClient: jest.fn().mockResolvedValue({ say: sayMock, onMessage: onMessageMock }),
}));

describe('lurk auto-removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes user from lurkingUsers, deletes DB entry, and announces', async () => {
    const { handleAutoRemoveLurk } = await import('../chat');
    const { lurkingUsers } = await import('../Commands/Information/lurk');

    // ensure clean state
    lurkingUsers.length = 0;

    const testUser = 'testuser';
    lurkingUsers.push(testUser);

    // call helper directly instead of initializing full chat subsystem
    const fakeMsg: any = {
      userInfo: { userId: 'u-123', displayName: 'TestUser', isMod: false, isBroadcaster: false },
      channelId: 'chan-1',
      id: 'm-1',
    };

    await handleAutoRemoveLurk('#channel', testUser, 'hello folks', fakeMsg, { say: sayMock } as any);

    expect(lurkingUsers).not.toContain(testUser);
    expect(deleteOneMock).toHaveBeenCalledWith({ id: 'u-123' });
    expect(sayMock).toHaveBeenCalledWith('#channel', 'TestUser is no longer lurking');
  });
});
