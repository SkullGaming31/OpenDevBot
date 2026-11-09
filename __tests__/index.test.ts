export { };

const mockInitializeMonitoring = jest.fn();
const mockInitializeTwitchEventSub = jest.fn().mockResolvedValue(undefined);
const mockStartRetryWorker = jest.fn().mockResolvedValue(undefined);
const mockInitializeErrorHandler = jest.fn().mockResolvedValue(undefined);
const mockInitializeChat = jest.fn().mockResolvedValue(undefined);
const mockOpenSqliteDatabase = jest.fn();
const mockInitializeWebhookQueue = jest.fn().mockResolvedValue(undefined);
const mockInitializeConstants = jest.fn().mockResolvedValue(undefined);
const mockDeleteAllInjuries = jest.fn().mockResolvedValue(undefined);
const mockDeleteExpiredInjuries = jest.fn().mockResolvedValue(undefined);
const mockListen = jest.fn((_port: string | number, callback?: () => void) => {
	callback?.();
	return {};
});
const mockApp = { listen: mockListen };
const mockLogger = {
	debug: jest.fn(),
	error: jest.fn(),
	info: jest.fn(),
	time: jest.fn(),
	timeEnd: jest.fn(),
	warn: jest.fn(),
};

const environmentKeys = [
	'ENVIRONMENT',
	'ENABLE_CHAT',
	'ENABLE_EVENTSUB',
	'PORT',
	'RESET_INJURIES',
	'INJURY_CLEANUP_INTERVAL_MS',
];
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

function setEnvironment(key: string, value: string): void {
	Reflect.set(process.env, key, value);
}

function mockDependencies() {
	jest.doMock('dotenv', () => ({ config: jest.fn() }));
	jest.doMock('../src/monitoring', () => ({ initMonitoring: mockInitializeMonitoring }));
	jest.doMock('../src/EventSubEvents', () => ({ initializeTwitchEventSub: mockInitializeTwitchEventSub }));
	jest.doMock('../src/EventSub/retryWorker', () => ({ startRetryWorker: mockStartRetryWorker }));
	jest.doMock('../src/Handlers/errorHandler', () => ({
		__esModule: true,
		default: jest.fn().mockImplementation(() => ({ initialize: mockInitializeErrorHandler })),
	}));
	jest.doMock('../src/chat', () => ({ initializeChat: mockInitializeChat }));
	jest.doMock('../src/database/sqliteConnection', () => ({ openSqliteDatabase: mockOpenSqliteDatabase }));
	jest.doMock('../src/Discord/webhookQueue', () => ({ initializeWebhookQueue: mockInitializeWebhookQueue }));
	jest.doMock('../src/util/createApp', () => ({ __esModule: true, default: jest.fn(() => mockApp) }));
	jest.doMock('../src/util/constants', () => ({ initializeConstants: mockInitializeConstants }));
	jest.doMock('../src/services/injuryCleanup', () => ({
		deleteAllInjuries: mockDeleteAllInjuries,
		deleteExpiredInjuries: mockDeleteExpiredInjuries,
	}));
	jest.doMock('../src/util/logger', () => ({ __esModule: true, default: mockLogger }));
}

describe('OpenDevBot startup', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		for (const key of environmentKeys) Reflect.deleteProperty(process.env, key);
		process.env.ENVIRONMENT = 'test';
		process.env.PORT = '4319';
		mockListen.mockImplementation((_port, callback) => {
			callback?.();
			return {};
		});
		mockInitializeErrorHandler.mockResolvedValue(undefined);
		mockInitializeTwitchEventSub.mockResolvedValue(undefined);
		mockInitializeChat.mockResolvedValue(undefined);
		mockInitializeConstants.mockReset().mockResolvedValue(undefined);
		mockDependencies();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
		for (const key of environmentKeys) {
			const original = originalEnvironment.get(key);
			if (original === undefined) Reflect.deleteProperty(process.env, key);
			else process.env[key] = original;
		}
	});

	async function createBot() {
		const { OpenDevBot } = await import('../src/index');
		return new OpenDevBot();
	}

	it('rejects unsupported environments before opening services', async () => {
		setEnvironment('ENVIRONMENT', 'staging');
		const bot = await createBot();

		await expect(bot.start()).rejects.toThrow('Unknown environment: staging');

		expect(mockOpenSqliteDatabase).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalledWith(
			'Error during bot startup:',
			expect.any(Error),
		);
	});

	it('starts application services with SQLite in test mode', async () => {
		setEnvironment('ENABLE_CHAT', 'true');
		setEnvironment('ENABLE_EVENTSUB', 'true');
		setEnvironment('RESET_INJURIES', 'true');
		const bot = await createBot();

		await bot.start();

		expect(mockOpenSqliteDatabase).toHaveBeenCalledTimes(1);
		expect(mockInitializeWebhookQueue).toHaveBeenCalledTimes(1);
		expect(mockDeleteAllInjuries).toHaveBeenCalledTimes(1);
		expect(mockDeleteExpiredInjuries).not.toHaveBeenCalled();
		expect(mockInitializeChat).not.toHaveBeenCalled();
		expect(mockInitializeTwitchEventSub).not.toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalledWith('4319', expect.any(Function));
	});

	it('initializes enabled Twitch services outside test mode', async () => {
		process.env.ENVIRONMENT = 'dev';
		setEnvironment('ENABLE_CHAT', 'true');
		setEnvironment('ENABLE_EVENTSUB', 'true');
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		const bot = await createBot();

		await bot.start();

		expect(mockDeleteExpiredInjuries).toHaveBeenCalledTimes(1);
		expect(mockInitializeConstants).toHaveBeenCalledTimes(2);
		expect(mockInitializeTwitchEventSub).toHaveBeenCalledTimes(1);
		expect(mockStartRetryWorker).toHaveBeenCalledTimes(1);
		expect(mockInitializeChat).toHaveBeenCalledTimes(1);
		expect(mockListen).toHaveBeenCalledWith('4319', expect.any(Function));
	});

	it('does not initialize explicitly disabled Twitch services outside test mode', async () => {
		process.env.ENVIRONMENT = 'dev';
		process.env.ENABLE_CHAT = 'false';
		process.env.ENABLE_EVENTSUB = 'false';
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		const bot = await createBot();

		await bot.start();

		expect(mockInitializeConstants).not.toHaveBeenCalled();
		expect(mockInitializeTwitchEventSub).not.toHaveBeenCalled();
		expect(mockStartRetryWorker).not.toHaveBeenCalled();
		expect(mockInitializeChat).not.toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalled();
	});

	it.each([
		['true', 'false', 1, 0],
		['false', 'true', 0, 1],
	])('treats chat=%s and EventSub=%s independently', async (chat, eventSub, chatCalls, eventSubCalls) => {
		process.env.ENVIRONMENT = 'dev';
		process.env.ENABLE_CHAT = chat;
		process.env.ENABLE_EVENTSUB = eventSub;
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		const bot = await createBot();

		await bot.start();

		expect(mockInitializeChat).toHaveBeenCalledTimes(chatCalls);
		expect(mockInitializeTwitchEventSub).toHaveBeenCalledTimes(eventSubCalls);
		expect(mockStartRetryWorker).toHaveBeenCalledTimes(eventSubCalls);
		expect(mockInitializeConstants).toHaveBeenCalledTimes(1);
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('starts chat and the API when EventSub initialization fails', async () => {
		process.env.ENVIRONMENT = 'dev';
		process.env.ENABLE_CHAT = 'true';
		process.env.ENABLE_EVENTSUB = 'true';
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		const failure = new Error('EventSub failed');
		mockInitializeTwitchEventSub.mockRejectedValueOnce(failure);
		const bot = await createBot();

		await bot.start();

		expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize EventSub:', failure);
		expect(mockInitializeChat).toHaveBeenCalledTimes(1);
		expect(mockStartRetryWorker).not.toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('starts the API when chat initialization fails', async () => {
		process.env.ENVIRONMENT = 'dev';
		process.env.ENABLE_CHAT = 'true';
		process.env.ENABLE_EVENTSUB = 'true';
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		const failure = new Error('chat failed');
		mockInitializeChat.mockRejectedValueOnce(failure);
		const bot = await createBot();

		await bot.start();

		expect(mockInitializeTwitchEventSub).toHaveBeenCalledTimes(1);
		expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize chat:', failure);
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('retries shared constants initialization for chat after EventSub initialization fails', async () => {
		process.env.ENVIRONMENT = 'dev';
		process.env.ENABLE_CHAT = 'true';
		process.env.ENABLE_EVENTSUB = 'true';
		process.env.INJURY_CLEANUP_INTERVAL_MS = '0';
		const failure = new Error('constants failed');
		mockInitializeConstants.mockRejectedValueOnce(failure);
		const bot = await createBot();

		await bot.start();

		expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize EventSub:', failure);
		expect(mockInitializeConstants).toHaveBeenCalledTimes(2);
		expect(mockInitializeChat).toHaveBeenCalledTimes(1);
		expect(mockListen).toHaveBeenCalledTimes(1);
	});

	it('schedules recurring injury cleanup only when enabled outside tests', async () => {
		process.env.ENVIRONMENT = 'prod';
		process.env.INJURY_CLEANUP_INTERVAL_MS = '2500';
		jest.useFakeTimers();
		const bot = await createBot();

		await bot.start();

		expect(jest.getTimerCount()).toBe(1);
		expect(mockDeleteExpiredInjuries).toHaveBeenCalledTimes(1);
		jest.clearAllTimers();
	});
});
