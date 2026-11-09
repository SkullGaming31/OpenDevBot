export {};

const mockHandlers = new Map<string, (...args: unknown[]) => unknown>();
const mockHandle = jest.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
	mockHandlers.set(channel, handler);
});
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

describe('Electron admin proxy retries', () => {
	const originalFetch = global.fetch;
	const originalToken = process.env.ADMIN_API_TOKEN;
	let mockFetch: jest.Mock;

	beforeEach(async () => {
		jest.resetModules();
		jest.clearAllMocks();
		mockLogger.info.mockReset();
		mockLogger.warn.mockReset();
		mockLogger.error.mockReset();
		jest.useFakeTimers();
		mockHandlers.clear();
		mockFetch = jest.fn();
		global.fetch = mockFetch as unknown as typeof fetch;
		process.env.ADMIN_API_TOKEN = 'synthetic-fallback-token';
		jest.doMock('electron', () => ({ ipcMain: { handle: mockHandle } }));
		jest.doMock('../../src/util/logger', () => ({ __esModule: true, default: mockLogger }));
		const { registerAdminProxy } = await import('../../electron/adminProxy');
		registerAdminProxy(4317);
	});

	afterEach(() => {
		jest.useRealTimers();
		global.fetch = originalFetch;
		if (originalToken === undefined) Reflect.deleteProperty(process.env, 'ADMIN_API_TOKEN');
		else process.env.ADMIN_API_TOKEN = originalToken;
	});

	it('uses and clears the in-memory token override', async () => {
		mockFetch.mockImplementation(() => Promise.resolve(new Response('ok')));
		const setToken = mockHandlers.get('admin:setToken')!;
		const getToken = mockHandlers.get('admin:getToken')!;
		const fetch = mockHandlers.get('admin:fetch')!;
		await setToken({}, 'synthetic-override');
		expect(await getToken({})).toBe('synthetic-override');
		await fetch({}, '/test');
		expect(mockFetch.mock.calls[0][1].headers['x-admin-token']).toBe('synthetic-override');
		await setToken({}, '');
		expect(await getToken({})).toBe('synthetic-fallback-token');
		await fetch({}, '/test');
		expect(mockFetch.mock.calls[1][1].headers['x-admin-token']).toBe('synthetic-fallback-token');
	});

	it('honors Retry-After on rate limiting and returns the successful response', async () => {
		mockFetch
			.mockResolvedValueOnce(new Response('busy', { status: 429, headers: { 'retry-after': '2' } }))
			.mockResolvedValueOnce(new Response('{"ok":true}', { headers: { 'content-type': 'text/plain' } }));
		const result = mockHandlers.get('admin:fetch')!({}, '/test');
		await jest.advanceTimersByTimeAsync(1999);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		await jest.advanceTimersByTimeAsync(1);
		await expect(result).resolves.toEqual({ ok: true });
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('retries network failures twice and propagates the final error', async () => {
		const failure = new Error('synthetic network failure');
		mockFetch.mockRejectedValue(failure);
		const result = mockHandlers.get('admin:fetch')!({}, '/test') as Promise<unknown>;
		const assertion = expect(result).rejects.toBe(failure);
		await jest.advanceTimersByTimeAsync(500);
		expect(mockFetch).toHaveBeenCalledTimes(2);
		await jest.advanceTimersByTimeAsync(1000);
		await assertion;
		expect(mockFetch).toHaveBeenCalledTimes(3);
		expect(mockLogger.error).toHaveBeenCalledTimes(1);
	});
});
