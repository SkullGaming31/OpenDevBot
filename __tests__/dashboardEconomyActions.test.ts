import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('dashboard economy actions', () => {
	const account = { userId: '123', displayName: 'Viewer', balance: { bank: 10, wallet: 5 } };

	function createActions(response: unknown, rejects = false) {
		const html = fs.readFileSync(path.join(process.cwd(), 'public', 'admin', 'dashboard.html'), 'utf8');
		const start = html.indexOf('        async function editAccount(acc) {');
		const end = html.indexOf('        // Modal helpers', start);
		if (start < 0 || end < 0) throw new Error('Dashboard economy action definitions not found');
		const fetch = rejects ? jest.fn().mockRejectedValue(response) : jest.fn().mockResolvedValue(response);
		const showToast = jest.fn();
		const loadEconomy = jest.fn().mockResolvedValue(undefined);
		const showConfirmModal = jest.fn().mockResolvedValue(true);
		const actions = vm.runInNewContext(`(function () { ${html.slice(start, end)}; return { editAccount, deleteAccount }; })()`, {
			hasBridge: true,
			window: {
				adminApi: { fetch },
				adminModalEdit: { show: jest.fn().mockResolvedValue({ bank: 20, wallet: 8 }) },
			},
			showToast,
			showConfirmModal,
			loadEconomy,
			console: { error: jest.fn() },
		}) as {
			editAccount: (entry: typeof account) => Promise<void>;
			deleteAccount: (entry: typeof account) => Promise<void>;
		};
		return { ...actions, fetch, showToast, loadEconomy, showConfirmModal };
	}

	it.each([
		['API error', { error: 'invalid amounts' }, false, 'invalid amounts'],
		['unexpected response', {}, false, 'Invalid response from economy API'],
		['network error', new Error('network failed'), true, 'network failed'],
	])('reports edit and delete failure for %s without refreshing', async (_label, response, rejects, detail) => {
		const actions = createActions(response, rejects);
		await actions.editAccount(account);
		await actions.deleteAccount(account);
		expect(actions.showToast.mock.calls.map(call => call[0])).toEqual([`Failed to update account: ${detail}`, `Failed to delete account: ${detail}`]);
		expect(actions.loadEconomy).not.toHaveBeenCalled();
		expect(actions.fetch).toHaveBeenNthCalledWith(1, '/api/v1/admin/economy/account/123', expect.objectContaining({ method: 'PUT' }));
		expect(actions.fetch).toHaveBeenNthCalledWith(2, '/api/v1/admin/economy/account/123', { method: 'DELETE' });
	});

	it('shows success and refreshes only when each operation succeeds', async () => {
		const actions = createActions({ ok: true });
		await actions.editAccount(account);
		await actions.deleteAccount(account);
		expect(actions.showToast.mock.calls.map(call => call[0])).toEqual(['Account updated', 'Account deleted']);
		expect(actions.loadEconomy).toHaveBeenCalledTimes(2);
		expect(actions.showConfirmModal).toHaveBeenCalledWith('Delete account Viewer? This cannot be undone.');
	});
});
