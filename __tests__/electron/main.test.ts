export { };

const mockEventSub = jest.fn().mockResolvedValue(undefined);
const mockChat = jest.fn().mockResolvedValue(undefined);
const mockConstants = jest.fn().mockResolvedValue(undefined);
const mockRetryWorker = jest.fn().mockResolvedValue(undefined);
const mockListen = jest.fn();
const mockWindow = { loadFile: jest.fn(), on: jest.fn() };
const mockLogger = {
	info: jest.fn(), warn: jest.fn(), error: jest.fn(), time: jest.fn(), timeEnd: jest.fn(),
};

describe('Electron startup integration flags', () => {
	const keys = ['ENVIRONMENT', 'ENABLE_CHAT', 'ENABLE_EVENTSUB', 'INJURY_CLEANUP_INTERVAL_MS', 'DEV_LOG_FILE', 'PROD_LOG_FILE', 'ADMIN_API_TOKEN'];
	const original = new Map(keys.map(key => [key, process.env[key]]));

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockEventSub.mockReset().mockResolvedValue(undefined);
		mockChat.mockReset().mockResolvedValue(undefined);
		mockConstants.mockReset().mockResolvedValue(undefined);
		process.env.ENVIRONMENT = 'dev';
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		jest.doMock('dotenv', () => ({ config: jest.fn() }));
		jest.doMock('electron', () => ({
			app: { isPackaged: false, getPath: jest.fn(() => 'test-user-data'), whenReady: () => Promise.resolve(), on: jest.fn() },
			BrowserWindow: jest.fn(() => mockWindow),
			ipcMain: { on: jest.fn() },
		}));
		jest.doMock('../../src/util/createApp', () => ({ __esModule: true, default: jest.fn(() => ({ listen: mockListen })) }));
		jest.doMock('../../src/database/sqliteConnection', () => ({ openSqliteDatabase: jest.fn() }));
		jest.doMock('../../src/Discord/webhookQueue', () => ({ initializeWebhookQueue: jest.fn() }));
		jest.doMock('../../src/util/logger', () => ({
			__esModule: true, default: mockLogger, setApplicationLogFile: jest.fn(), setErrorLogFile: jest.fn(),
		}));
		jest.doMock('../../electron/adminProxy', () => ({ registerAdminProxy: jest.fn() }));
		jest.doMock('../../electron/twitchSignup', () => ({ registerTwitchSignupHandler: jest.fn() }));
		jest.doMock('../../electron/logsBridge', () => ({ registerLogsBridge: jest.fn() }));
		jest.doMock('../../src/util/constants', () => ({ initializeConstants: mockConstants }));
		jest.doMock('../../src/EventSubEvents', () => ({ initializeTwitchEventSub: mockEventSub }));
		jest.doMock('../../src/EventSub/retryWorker', () => ({ startRetryWorker: mockRetryWorker }));
		jest.doMock('../../src/chat', () => ({ initializeChat: mockChat }));
		jest.doMock('../../src/util/monitorBroadcaster', () => ({ setBroadcaster: jest.fn() }));
		jest.doMock('../../src/Handlers/errorHandler', () => ({
			__esModule: true, default: jest.fn(() => ({ initialize: jest.fn() })),
		}));
		jest.doMock('../../src/services/injuryCleanup', () => ({
			deleteAllInjuries: jest.fn(), deleteExpiredInjuries: jest.fn(),
		}));
		jest.doMock('../../src/monitoring', () => ({ initMonitoring: jest.fn() }));
	});

	afterEach(() => {
		for (const key of keys) {
			const value = original.get(key);
			if (value === undefined) Reflect.deleteProperty(process.env, key);
			else Reflect.set(process.env, key, value);
		}
	});

	it.each([
		['false', 0],
		['true', 1],
	])('starts each integration only when its flag is %s', async (value, calls) => {
		process.env.ENABLE_CHAT = value;
		process.env.ENABLE_EVENTSUB = value;
		let resolveListen: () => void = () => undefined;
		const listening = new Promise<void>(resolve => { resolveListen = resolve; });
		mockListen.mockImplementation(() => resolveListen());

		await import('../../electron/main');
		await listening;

		expect(mockEventSub).toHaveBeenCalledTimes(calls);
		expect(mockRetryWorker).toHaveBeenCalledTimes(calls);
		expect(mockChat).toHaveBeenCalledTimes(calls);
		expect(mockConstants).toHaveBeenCalledTimes(calls * 2);
		expect(mockListen).toHaveBeenCalledWith(expect.any(Number), '127.0.0.1', expect.any(Function));
	});

	it.each([
		['true', 'false', 1, 0],
		['false', 'true', 0, 1],
	])('treats chat=%s and EventSub=%s independently', async (chat, eventSub, chatCalls, eventSubCalls) => {
		process.env.ENABLE_CHAT = chat;
		process.env.ENABLE_EVENTSUB = eventSub;
		let resolveListen: () => void = () => undefined;
		const listening = new Promise<void>(resolve => { resolveListen = resolve; });
		mockListen.mockImplementation(() => resolveListen());

		await import('../../electron/main');
		await listening;

		expect(mockChat).toHaveBeenCalledTimes(chatCalls);
		expect(mockEventSub).toHaveBeenCalledTimes(eventSubCalls);
		expect(mockRetryWorker).toHaveBeenCalledTimes(eventSubCalls);
		expect(mockConstants).toHaveBeenCalledTimes(1);
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('starts chat and the API when EventSub initialization fails', async () => {
		process.env.ENABLE_CHAT = 'true';
		process.env.ENABLE_EVENTSUB = 'true';
		const failure = new Error('EventSub failed');
		mockEventSub.mockRejectedValueOnce(failure);
		let resolveListen: () => void = () => undefined;
		const listening = new Promise<void>(resolve => { resolveListen = resolve; });
		mockListen.mockImplementation(() => resolveListen());

		await import('../../electron/main');
		await listening;

		expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize EventSub (electron)', failure);
		expect(mockChat).toHaveBeenCalledTimes(1);
		expect(mockRetryWorker).not.toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('retries shared constants initialization for chat after EventSub initialization fails', async () => {
		process.env.ENABLE_CHAT = 'true';
		process.env.ENABLE_EVENTSUB = 'true';
		const failure = new Error('constants failed');
		mockConstants.mockRejectedValueOnce(failure);
		let resolveListen: () => void = () => undefined;
		const listening = new Promise<void>(resolve => { resolveListen = resolve; });
		mockListen.mockImplementation(() => resolveListen());

		await import('../../electron/main');
		await listening;

		expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize EventSub (electron)', failure);
		expect(mockConstants).toHaveBeenCalledTimes(2);
		expect(mockChat).toHaveBeenCalledTimes(1);
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('starts the API when chat initialization fails', async () => {
		process.env.ENABLE_CHAT = 'true';
		process.env.ENABLE_EVENTSUB = 'true';
		const failure = new Error('chat failed');
		mockChat.mockRejectedValueOnce(failure);
		let resolveListen: () => void = () => undefined;
		const listening = new Promise<void>(resolve => { resolveListen = resolve; });
		mockListen.mockImplementation(() => resolveListen());

		await import('../../electron/main');
		await listening;

		expect(mockEventSub).toHaveBeenCalledTimes(1);
		expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize chat (electron)', failure);
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('shares a private per-process token between the API and Electron proxy', async () => {
		delete process.env.ADMIN_API_TOKEN;
		process.env.ENABLE_CHAT = 'false';
		process.env.ENABLE_EVENTSUB = 'false';
		let resolveListen: () => void = () => undefined;
		const listening = new Promise<void>(resolve => { resolveListen = resolve; });
		mockListen.mockImplementation(() => resolveListen());

		await import('../../electron/main');
		await listening;
		await new Promise<void>(resolve => setImmediate(resolve));
		const createApp = (await import('../../src/util/createApp')).default;
		const { registerAdminProxy } = await import('../../electron/adminProxy');
		const options = jest.mocked(createApp).mock.calls[0][0];
		expect(options?.localAdminToken).toMatch(/^[a-f0-9]{64}$/);
		expect(registerAdminProxy).toHaveBeenCalledWith(expect.any(Number), options?.localAdminToken);
		expect(mockListen).toHaveBeenCalledWith(expect.any(Number), '127.0.0.1', expect.any(Function));
	});
});
