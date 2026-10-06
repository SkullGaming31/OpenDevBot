export {};

const mockHandlers = new Map<string, (...args: unknown[]) => unknown>();
const mockHandle = jest.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
	mockHandlers.set(channel, handler);
});
const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('Electron admin API proxy', () => {
	const originalFetch = global.fetch;
	let mockFetch: jest.Mock;

	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		mockHandlers.clear();
		mockFetch = jest.fn();
		global.fetch = mockFetch as unknown as typeof fetch;
		jest.doMock('electron', () => ({ ipcMain: { handle: mockHandle } }));
		jest.doMock('../../src/util/logger', () => ({
			__esModule: true,
			default: mockLogger,
		}));
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	async function registerProxy() {
		const { registerAdminProxy } = await import('../adminProxy');
		registerAdminProxy(4317);
		return mockHandlers;
	}

	it('forwards method and body primitive arguments with the admin token', async () => {
		mockFetch.mockResolvedValue(new Response(JSON.stringify({ settings: { bitsThreshold: 25 } }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		}));
		const handlers = await registerProxy();
		await handlers.get('admin:setToken')?.({}, 'test-admin-token');

		const response = await handlers.get('admin:fetch')?.(
			{},
			'/api/v1/admin/settings/monitor',
			'PUT',
			'{"bitsThreshold":25}',
		);

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:4317/api/v1/admin/settings/monitor',
			expect.objectContaining({
				method: 'PUT',
				body: '{"bitsThreshold":25}',
				headers: expect.objectContaining({ 'x-admin-token': 'test-admin-token' }),
			}),
		);
		expect(response).toEqual({ settings: { bitsThreshold: 25 } });
	});

	it('returns parsed error responses so the renderer can display them', async () => {
		mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'invalid monitor settings' }), {
			status: 400,
			headers: { 'content-type': 'application/json' },
		}));
		const handlers = await registerProxy();

		const response = await handlers.get('admin:fetch')?.(
			{},
			'/api/v1/admin/settings/monitor',
			'PUT',
			'{}',
		);

		expect(response).toEqual({ error: 'invalid monitor settings' });
	});
});
