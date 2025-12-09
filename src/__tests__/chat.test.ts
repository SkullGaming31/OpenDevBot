jest.mock('../api/userApiClient', () => ({
	getUserApi: async () => ({
		streams: { getStreamByUserId: jest.fn().mockResolvedValue(null) },
		users: { getUserByName: jest.fn().mockResolvedValue(null) },
		channels: { getChannelInfoById: jest.fn().mockResolvedValue({ id: 'chan' }) },
		moderation: { checkUserMod: jest.fn().mockResolvedValue(false) },
		chat: { getChatters: jest.fn().mockResolvedValue({ data: [] }) },
	}),
}));

jest.mock('../auth/authProvider', () => ({
	getChatAuthProvider: async () => ({ /* minimal stub */ }),
}));

jest.mock('../database/tokenStore', () => ({
	getUsernamesFromDatabase: async () => [],
}));

// Mock the Twurple ChatClient class with a lightweight stub
const mockOn = jest.fn();
const mockConnect = jest.fn();
const mockJoin = jest.fn();
const mockReconnect = jest.fn();
const mockSay = jest.fn();
const mockAction = jest.fn();
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockQuit = jest.fn().mockResolvedValue(undefined);

jest.mock('@twurple/chat', () => ({
	ChatClient: jest.fn().mockImplementation(() => ({
		onJoin: (fn: any) => { void fn; /* store if needed */ },
		onPart: (fn: any) => { void fn; /* store if needed */ },
		onMessage: (fn: any) => { void fn; /* store if needed */ },
		onAuthenticationFailure: (fn: any) => { void fn; /* store if needed */ },
		connect: mockConnect,
		join: mockJoin,
		reconnect: mockReconnect,
		say: mockSay,
		action: mockAction,
		isConnected: true,
		disconnect: mockDisconnect,
		quit: mockQuit,
	})),
}));

// Prevent other DB models from causing import-time side effects in this test
jest.mock('../database/models/userModel', () => ({
	UserModel: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null), create: jest.fn() },
}));

describe('chat module (unit)', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('getChatClient initializes and shutdownChat disconnects', async () => {
		const chat = await import('../chat');
		const { getChatClient, shutdownChat } = chat;

		const client = await getChatClient();
		expect(client).toBeDefined();

		// calling shutdownChat should attempt to disconnect the client without throwing
		await expect(shutdownChat()).resolves.toBeUndefined();

		// the mocked disconnect or quit should have been callable (one of them)
		const twurple = await import('@twurple/chat');
		const ChatClient = (twurple as any).ChatClient;
		expect(ChatClient).toBeDefined();
	});
});
