export {};

describe('Electron Twitch signup bridge', () => {
	const handlers = new Map<string, (...args: any[]) => void>();
	const navigation = new Map<string, (...args: any[]) => Promise<void>>();
	const sender = { isDestroyed: jest.fn(), send: jest.fn() };
	const window = {
		loadURL: jest.fn(),
		isDestroyed: jest.fn(),
		close: jest.fn(),
		webContents: {
			on: jest.fn((name: string, listener: (...args: any[]) => Promise<void>) => navigation.set(name, listener)),
			executeJavaScript: jest.fn(),
		},
	};
	const browserWindow = jest.fn(() => window);
	const logger = { error: jest.fn() };

	beforeEach(async () => {
		jest.resetModules();
		jest.clearAllMocks();
		handlers.clear();
		navigation.clear();
		sender.isDestroyed.mockReturnValue(false);
		window.isDestroyed.mockReturnValue(false);
		jest.doMock('electron', () => ({
			BrowserWindow: browserWindow,
			ipcMain: { on: (name: string, listener: (...args: any[]) => void) => handlers.set(name, listener) },
		}));
		jest.doMock('../../src/util/logger', () => ({ __esModule: true, default: logger }));
		const { registerTwitchSignupHandler } = await import('../../electron/twitchSignup');
		registerTwitchSignupHandler(4317);
	});

	it('ignores unrelated navigation and sends the parsed callback to the requesting renderer', async () => {
		handlers.get('twitch:signup')!({ sender }, 'bot');
		expect(window.loadURL).toHaveBeenCalledWith('http://127.0.0.1:4317/api/v1/twitch?type=bot');
		expect(browserWindow).toHaveBeenCalledWith(expect.objectContaining({
			webPreferences: { nodeIntegration: false, contextIsolation: true },
		}));
		const navigate = navigation.get('did-navigate')!;
		await navigate({}, 'http://127.0.0.1:4317/other');
		expect(window.webContents.executeJavaScript).not.toHaveBeenCalled();
		window.webContents.executeJavaScript.mockResolvedValue('{"username":"ExampleBot"}');
		await navigate({}, 'http://127.0.0.1:4317/api/v1/auth/twitch/callback');
		expect(sender.send).toHaveBeenCalledWith('twitch:signupComplete', {
			type: 'bot', result: { username: 'ExampleBot' },
		});
		expect(window.close).toHaveBeenCalledTimes(1);
	});

	it('reports malformed callback data and closes the window', async () => {
		handlers.get('twitch:signup')!({ sender });
		window.webContents.executeJavaScript.mockResolvedValue('not json');
		await navigation.get('did-navigate')!({}, 'http://127.0.0.1:4317/api/v1/auth/twitch/callback');
		expect(sender.send).toHaveBeenCalledWith('twitch:signupComplete', {
			type: 'user', result: { error: 'Failed to complete sign-up' },
		});
		expect(window.close).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledTimes(1);
	});

	it('does not send to a destroyed renderer or close a destroyed window', async () => {
		handlers.get('twitch:signup')!({ sender }, 'user');
		sender.isDestroyed.mockReturnValue(true);
		window.isDestroyed.mockReturnValue(true);
		window.webContents.executeJavaScript.mockResolvedValue('{"ok":true}');
		await navigation.get('did-navigate')!({}, 'http://127.0.0.1:4317/api/v1/auth/twitch/callback');
		expect(sender.send).not.toHaveBeenCalled();
		expect(window.close).not.toHaveBeenCalled();
	});
});
