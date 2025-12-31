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
		lurkingUsers.clear();

		const testUser = 'testuser';
		lurkingUsers.add(testUser);

		// call helper directly instead of initializing full chat subsystem
		const fakeMsg: any = {
			userInfo: { userId: 'u-123', displayName: 'TestUser', isMod: false, isBroadcaster: false },
			channelId: 'chan-1',
			id: 'm-1',
		};

		await handleAutoRemoveLurk('#channel', testUser, 'hello folks', fakeMsg, { say: sayMock } as any);

		expect(lurkingUsers.has(testUser)).toBe(false);
		expect(deleteOneMock).toHaveBeenCalledWith({ id: 'u-123' });
		expect(sayMock).toHaveBeenCalledWith('#channel', 'TestUser is no longer lurking');
	});

	it('does nothing when message is a command (starts with !)', async () => {
		const { handleAutoRemoveLurk } = await import('../chat');
		const { lurkingUsers } = await import('../Commands/Information/lurk');

		lurkingUsers.clear();
		const testUser = 'cmduser';
		lurkingUsers.add(testUser);

		const fakeMsg: any = {
			userInfo: { userId: 'u-222', displayName: 'CmdUser', isMod: false, isBroadcaster: false },
			channelId: 'chan-1',
			id: 'm-2',
		};

		await handleAutoRemoveLurk('#channel', testUser, '!notarealmessage', fakeMsg, { say: sayMock } as any);

		expect(lurkingUsers.has(testUser)).toBe(true);
		expect(deleteOneMock).not.toHaveBeenCalled();
		expect(sayMock).not.toHaveBeenCalledWith('#channel', 'CmdUser is no longer lurking');
	});

	it('does nothing when user is not in lurkingUsers', async () => {
		const { handleAutoRemoveLurk } = await import('../chat');
		const { lurkingUsers } = await import('../Commands/Information/lurk');

		lurkingUsers.clear(); // empty

		const fakeMsg: any = {
			userInfo: { userId: 'u-333', displayName: 'NoLurker', isMod: false, isBroadcaster: false },
			channelId: 'chan-1',
			id: 'm-3',
		};

		await handleAutoRemoveLurk('#channel', 'someoneElse', 'hello', fakeMsg, { say: sayMock } as any);

		expect(deleteOneMock).not.toHaveBeenCalled();
		expect(sayMock).not.toHaveBeenCalledWith('#channel', expect.stringContaining('no longer lurking'));
	});

	it('logs a warning when DB deletion fails but still attempts announcement', async () => {
		const { handleAutoRemoveLurk } = await import('../chat');
		const { lurkingUsers } = await import('../Commands/Information/lurk');
		const logger = await import('../util/logger');

		lurkingUsers.clear();
		const testUser = 'dbfail';
		lurkingUsers.add(testUser);

		// simulate DB delete failure
		deleteOneMock.mockRejectedValueOnce(new Error('db down'));
		const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => { });

		const fakeMsg: any = {
			userInfo: { userId: 'u-444', displayName: 'DBFail', isMod: false, isBroadcaster: false },
			channelId: 'chan-1',
			id: 'm-4',
		};

		await handleAutoRemoveLurk('#channel', testUser, 'hello', fakeMsg, { say: sayMock } as any);

		expect(warnSpy).toHaveBeenCalledWith('Failed to delete saved lurk message for user', expect.objectContaining({ user: 'u-444' }));
		expect(sayMock).toHaveBeenCalledWith('#channel', 'DBFail is no longer lurking');
		warnSpy.mockRestore();
	});

	it('logs a warning when announcement fails after successful DB delete', async () => {
		const { handleAutoRemoveLurk } = await import('../chat');
		const { lurkingUsers } = await import('../Commands/Information/lurk');
		const logger = await import('../util/logger');

		lurkingUsers.clear();
		const testUser = 'sayfail';
		lurkingUsers.add(testUser);

		// ensure DB delete succeeds
		deleteOneMock.mockResolvedValueOnce({});
		// simulate say failure
		sayMock.mockRejectedValueOnce(new Error('network'));

		const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => { });

		const fakeMsg: any = {
			userInfo: { userId: 'u-555', displayName: 'SayFail', isMod: false, isBroadcaster: false },
			channelId: 'chan-1',
			id: 'm-5',
		};

		await handleAutoRemoveLurk('#channel', testUser, 'hello', fakeMsg, { say: sayMock } as any);

		expect(deleteOneMock).toHaveBeenCalledWith({ id: 'u-555' });
		expect(warnSpy).toHaveBeenCalledWith('Failed to announce lurk removal', expect.any(Error));
		warnSpy.mockRestore();
	});
});
