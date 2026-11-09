import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('dashboard admin token loading', () => {
	function createTokenSettings(bridgeToken: string, storedToken: string, hasBridge = true) {
		const html = fs.readFileSync(path.join(process.cwd(), 'public', 'admin', 'dashboard.html'), 'utf8');
		const start = html.indexOf("        const adminToken = ref('');");
		const end = html.indexOf('        function showAllEvents()', start);
		if (start < 0 || end < 0) throw new Error('Dashboard admin token settings not found');
		const getToken = jest.fn().mockResolvedValue(bridgeToken);
		const setToken = jest.fn().mockResolvedValue(true);
		const getItem = jest.fn().mockReturnValue(storedToken);
		const settings = vm.runInNewContext(`(function () { ${html.slice(start, end)}; return { adminToken, loadAdminToken }; })()`, {
			ref: (value: string) => ({ value }),
			hasBridge,
			window: { adminApi: { getToken, setToken } },
			localStorage: { getItem },
			console,
			showToast: jest.fn(),
		}) as { adminToken: { value: string }; loadAdminToken: () => Promise<void> };
		return { ...settings, getItem, setToken };
	}

	it('does not replace the private session token with a stale saved token in Electron', async () => {
		const settings = createTokenSettings('', 'stale-token');
		await settings.loadAdminToken();
		expect(settings.adminToken.value).toBe('');
		expect(settings.getItem).not.toHaveBeenCalled();
		expect(settings.setToken).toHaveBeenCalledWith('');
	});

	it('uses the configured Electron token when one is available', async () => {
		const settings = createTokenSettings('configured-token', 'stale-token');
		await settings.loadAdminToken();
		expect(settings.adminToken.value).toBe('configured-token');
		expect(settings.setToken).toHaveBeenCalledWith('configured-token');
	});

	it('keeps using local storage for browser-only preview', async () => {
		const settings = createTokenSettings('', 'stored-token', false);
		await settings.loadAdminToken();
		expect(settings.adminToken.value).toBe('stored-token');
		expect(settings.setToken).not.toHaveBeenCalled();
	});
});
