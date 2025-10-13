describe('bot startup', () => {
	beforeEach(() => {
		jest.resetModules();
		// clear env
		delete process.env.RESET_INJURIES;
		process.env.Enviroment = 'dev';
		process.env.DOCKER_URI = 'mongodb://localhost:27017/test';
	});

	test('uses expiry cleanup by default and starts server', async () => {
		const mockConnect = jest.fn().mockResolvedValue(undefined);
		const MockDatabase = jest.fn().mockImplementation((uri: string) => ({ connect: mockConnect }));

		const mockDeleteExpired = jest.fn().mockResolvedValue(undefined);
		const mockDeleteAll = jest.fn().mockResolvedValue(undefined);

		const mockListen = jest.fn((port: any, cb: any) => cb && cb());
		const mockCreateApp = jest.fn(() => ({ listen: mockListen }));

		const mockInitEventSub = jest.fn().mockResolvedValue(undefined);
		const mockInitChat = jest.fn().mockResolvedValue(undefined);

		const mockErrorInit = jest.fn().mockResolvedValue(undefined);
		const MockErrorHandler = jest.fn().mockImplementation(() => ({ initialize: mockErrorInit }));

		await jest.isolateModulesAsync(async () => {
			jest.doMock('../database', () => MockDatabase);
			jest.doMock('../services/injuryCleanup', () => ({ deleteAllInjuries: mockDeleteAll, deleteExpiredInjuries: mockDeleteExpired }));
			jest.doMock('../util/createApp', () => mockCreateApp);
			jest.doMock('../EventSubEvents', () => ({ initializeTwitchEventSub: mockInitEventSub }));
			jest.doMock('../chat', () => ({ initializeChat: mockInitChat }));
			jest.doMock('../Handlers/errorHandler', () => MockErrorHandler);

			// require the module which will instantiate and start the bot
			require('../index');

			// wait for async startup to complete
			await new Promise((r) => setImmediate(r));
		});

		expect(MockDatabase).toHaveBeenCalledWith('mongodb://localhost:27017/test');
		expect(mockConnect).toHaveBeenCalled();
		expect(mockDeleteExpired).toHaveBeenCalled();
		expect(mockDeleteAll).not.toHaveBeenCalled();
		expect(mockCreateApp).toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalled();
		expect(MockErrorHandler).toHaveBeenCalled();
	});

	test('when RESET_INJURIES=true deletes all injuries instead', async () => {
		process.env.RESET_INJURIES = 'true';

		const mockConnect = jest.fn().mockResolvedValue(undefined);
		const MockDatabase = jest.fn().mockImplementation((uri: string) => ({ connect: mockConnect }));

		const mockDeleteExpired = jest.fn().mockResolvedValue(undefined);
		const mockDeleteAll = jest.fn().mockResolvedValue(undefined);

		const mockListen = jest.fn((port: any, cb: any) => cb && cb());
		const mockCreateApp = jest.fn(() => ({ listen: mockListen }));

		const mockInitEventSub = jest.fn().mockResolvedValue(undefined);
		const mockInitChat = jest.fn().mockResolvedValue(undefined);

		const mockErrorInit = jest.fn().mockResolvedValue(undefined);
		const MockErrorHandler = jest.fn().mockImplementation(() => ({ initialize: mockErrorInit }));

		await jest.isolateModulesAsync(async () => {
			jest.doMock('../database', () => MockDatabase);
			jest.doMock('../services/injuryCleanup', () => ({ deleteAllInjuries: mockDeleteAll, deleteExpiredInjuries: mockDeleteExpired }));
			jest.doMock('../util/createApp', () => mockCreateApp);
			jest.doMock('../EventSubEvents', () => ({ initializeTwitchEventSub: mockInitEventSub }));
			jest.doMock('../chat', () => ({ initializeChat: mockInitChat }));
			jest.doMock('../Handlers/errorHandler', () => MockErrorHandler);

			require('../index');
			await new Promise((r) => setImmediate(r));
		});

		expect(MockDatabase).toHaveBeenCalledWith('mongodb://localhost:27017/test');
		expect(mockConnect).toHaveBeenCalled();
		expect(mockDeleteAll).toHaveBeenCalled();
		expect(mockDeleteExpired).not.toHaveBeenCalled();
		expect(mockCreateApp).toHaveBeenCalled();
		expect(mockListen).toHaveBeenCalled();
	});
});
