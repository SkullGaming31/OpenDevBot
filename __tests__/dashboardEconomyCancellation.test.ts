import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('dashboard economy action guards', () => {
	function setup(hasBridge = true) {
		const html = fs.readFileSync(path.join(process.cwd(), 'public', 'admin', 'dashboard.html'), 'utf8');
		const start = html.indexOf('        async function editAccount(acc) {');
		const end = html.indexOf('        // Modal helpers', start);
		if (start < 0 || end < 0) throw new Error('Dashboard economy action definitions not found');
		const fetch = jest.fn();
		const editModal = jest.fn();
		const confirm = jest.fn();
		const showToast = jest.fn();
		const loadEconomy = jest.fn();
		const actions = vm.runInNewContext(`(function () { ${html.slice(start, end)}; return { editAccount, deleteAccount }; })()`, {
			hasBridge,
			window: { adminApi: { fetch }, adminModalEdit: { show: editModal } },
			showConfirmModal: confirm, showToast, loadEconomy, console: { error: jest.fn() },
		}) as { editAccount: (account: unknown) => Promise<void>; deleteAccount: (account: unknown) => Promise<void> };
		return { ...actions, fetch, editModal, confirm, showToast, loadEconomy };
	}

	const account = { _id: 'account-1', displayName: 'Viewer', balance: { bank: 10, wallet: 5 } };

	it('does not mutate or refresh after either modal is cancelled', async () => {
		const actions = setup();
		actions.editModal.mockResolvedValue(null);
		actions.confirm.mockResolvedValue(false);
		await actions.editAccount(account);
		await actions.deleteAccount(account);
		expect(actions.fetch).not.toHaveBeenCalled();
		expect(actions.loadEconomy).not.toHaveBeenCalled();
		expect(actions.showToast).not.toHaveBeenCalled();
	});

	it('rejects invalid edit amounts before sending a request', async () => {
		const actions = setup();
		actions.editModal.mockResolvedValue({ bank: 'not-a-number', wallet: 5 });
		await actions.editAccount(account);
		expect(actions.showToast).toHaveBeenCalledWith('Invalid amounts');
		expect(actions.fetch).not.toHaveBeenCalled();
		expect(actions.loadEconomy).not.toHaveBeenCalled();
	});

	it('refuses both actions without the Electron bridge', async () => {
		const actions = setup(false);
		await actions.editAccount(account);
		await actions.deleteAccount(account);
		expect(actions.showToast.mock.calls.map(call => call[0])).toEqual([
			'Edit requires the Electron shell', 'Delete requires the Electron shell',
		]);
		expect(actions.editModal).not.toHaveBeenCalled();
		expect(actions.confirm).not.toHaveBeenCalled();
		expect(actions.fetch).not.toHaveBeenCalled();
	});
});
