export {};

const mockExposeInMainWorld = jest.fn();
const mockInvoke = jest.fn();
const mockSend = jest.fn();
const mockOn = jest.fn();

describe('Electron preload APIs', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
		jest.doMock('electron', () => ({
			contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
			ipcRenderer: { invoke: mockInvoke, send: mockSend, on: mockOn },
		}));
	});

	it('sends monitor visibility as a primitive JSON string', async () => {
		await import('../preload');
		const monitorApi = mockExposeInMainWorld.mock.calls.find(([name]) => name === 'monitorApi')?.[1] as {
			setVisibility: (serializedMap: string) => void;
			onEvent: (callback: (entry: unknown) => void) => void;
		};
		const serializedMap = JSON.stringify({ chat: true, follow: false });
		const callback = jest.fn();
		const entry = { event: 'chat:message', payload: { text: 'hello' }, timestamp: 'now' };

		monitorApi.setVisibility(serializedMap);
		monitorApi.onEvent(callback);
		const listener = mockOn.mock.calls.find(([channel]) => channel === 'monitor:new')?.[1] as
			(event: unknown, value: unknown) => void;
		listener({}, entry);

		expect(mockSend).toHaveBeenCalledWith('monitor:visibilityUpdate', serializedMap);
		expect(callback).toHaveBeenCalledWith(entry);
	});

	it('unpacks admin fetch options into primitive IPC arguments', async () => {
		await import('../preload');
		const adminApi = mockExposeInMainWorld.mock.calls.find(([name]) => name === 'adminApi')?.[1] as {
			fetch: (path: string, opts?: { method?: string; body?: string }) => unknown;
		};
		const body = JSON.stringify({ bitsThreshold: 25 });

		adminApi.fetch('/api/v1/admin/settings/monitor', { method: 'PUT', body });

		expect(mockInvoke).toHaveBeenCalledWith(
			'admin:fetch',
			'/api/v1/admin/settings/monitor',
			'PUT',
			body,
		);
	});

	it('forwards Twitch signup and signup-complete callbacks', async () => {
		await import('../preload');
		const twitchApi = mockExposeInMainWorld.mock.calls.find(([name]) => name === 'twitchApi')?.[1] as {
			signup: (type: 'user' | 'bot') => void;
			onSignupComplete: (callback: (result: unknown) => void) => void;
		};
		const callback = jest.fn();
		const result = { type: 'bot', result: { username: 'opendevbot' } };

		twitchApi.signup('bot');
		twitchApi.onSignupComplete(callback);
		const listener = mockOn.mock.calls.find(([channel]) => channel === 'twitch:signupComplete')?.[1] as
			(event: unknown, value: unknown) => void;
		listener({}, result);

		expect(mockSend).toHaveBeenCalledWith('twitch:signup', 'bot');
		expect(callback).toHaveBeenCalledWith(result);
	});

	it('forwards admin token calls and log bridge events', async () => {
		await import('../preload');
		const adminApi = mockExposeInMainWorld.mock.calls.find(([name]) => name === 'adminApi')?.[1] as {
			setToken: (token: string) => Promise<unknown>;
			getToken: () => Promise<unknown>;
		};
		const logsApi = mockExposeInMainWorld.mock.calls.find(([name]) => name === 'logsApi')?.[1] as {
			openWindow: () => void;
			getHistory: () => Promise<unknown>;
			onNewLog: (callback: (entry: unknown) => void) => void;
		};
		const callback = jest.fn();
		const entry = { level: 'info', message: 'ready', timestamp: 'now' };

		await adminApi.setToken('admin-token');
		await adminApi.getToken();
		logsApi.openWindow();
		await logsApi.getHistory();
		logsApi.onNewLog(callback);
		const listener = mockOn.mock.calls.find(([channel]) => channel === 'logs:new')?.[1] as
			(event: unknown, value: unknown) => void;
		listener({}, entry);

		expect(mockInvoke).toHaveBeenNthCalledWith(1, 'admin:setToken', 'admin-token');
		expect(mockInvoke).toHaveBeenNthCalledWith(2, 'admin:getToken');
		expect(mockInvoke).toHaveBeenNthCalledWith(3, 'logs:getHistory');
		expect(mockSend).toHaveBeenCalledWith('logs:open');
		expect(callback).toHaveBeenCalledWith(entry);
	});
});
