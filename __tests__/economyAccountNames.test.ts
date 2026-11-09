import type { IBankAccount } from '../src/database/models/bankAccount';
import { createEconomyAccountNameResolver } from '../src/services/economyAccountNames';

const mockFind = jest.fn();
const mockGetUsersByIds = jest.fn();
const mockGetUserApi = jest.fn();

jest.mock('../src/database/models/userModel', () => ({ UserModel: { find: (...args: unknown[]) => mockFind(...args) } }));
jest.mock('../src/api/userApiClient', () => ({ getUserApi: () => mockGetUserApi() }));

function account(userId: string, username = ''): IBankAccount {
	return { userId, username, balance: { bank: 0, wallet: 0 }, createdAt: new Date(0), updatedAt: new Date(0) };
}

describe('economy account name resolution', () => {
	beforeEach(() => {
		mockFind.mockReset().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		mockGetUsersByIds.mockReset();
		mockGetUserApi.mockReset().mockResolvedValue({ users: { getUsersByIds: mockGetUsersByIds } });
	});

	afterEach(() => jest.restoreAllMocks());

	it('deduplicates numeric IDs, batches at 100, and retries only a failed batch', async () => {
		const resolve = createEconomyAccountNameResolver();
		const accounts = Array.from({ length: 101 }, (_, index) => account(String(index + 1), `Saved${index + 1}`));
		accounts.push(account('1', 'Duplicate'), account('offline-user', 'OfflineName'));
		const ids = accounts.slice(0, 101).map(item => item.userId);
		mockGetUsersByIds
			.mockResolvedValueOnce(ids.slice(0, 100).map(id => ({ id, displayName: `Live${id}` })))
			.mockRejectedValueOnce(new Error('synthetic lookup failure'))
			.mockResolvedValueOnce([{ id: '101', displayName: 'Live101' }]);

		const first = await resolve(accounts);
		expect(mockFind).toHaveBeenCalledWith({ id: { $in: ids } });
		expect(mockGetUsersByIds.mock.calls.map(call => call[0])).toEqual([ids.slice(0, 100), ['101']]);
		expect(first[0].displayName).toBe('Live1');
		expect(first[100].displayName).toBe('Saved101');
		expect(first[101].displayName).toBe('Live1');
		expect(first[102].displayName).toBe('OfflineName');

		const second = await resolve(accounts);
		expect(mockGetUsersByIds.mock.calls[2][0]).toEqual(['101']);
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(3);
		expect(second[100].displayName).toBe('Live101');
		expect(accounts[100].username).toBe('Saved101');
	});

	it('uses saved names when acquiring the Twitch client fails, then retries', async () => {
		const resolve = createEconomyAccountNameResolver();
		mockFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ id: '42', username: ' Local ' }]) });
		mockGetUserApi.mockRejectedValueOnce(new Error('synthetic auth failure'));
		mockGetUsersByIds.mockResolvedValueOnce([{ id: '42', displayName: 'Fresh' }]);

		expect((await resolve([account('42', 'Saved'), account('43')])).map(item => item.displayName))
			.toEqual(['Local', '43']);
		expect((await resolve([account('42', 'Saved'), account('43')])).map(item => item.displayName))
			.toEqual(['Fresh', '43']);
		expect(mockGetUserApi).toHaveBeenCalledTimes(2);
	});

	it('keeps username-only account names distinct', async () => {
		const first = account('', 'First');
		const second = account('', 'Second');
		Reflect.deleteProperty(first, 'userId');
		Reflect.deleteProperty(second, 'userId');

		const resolved = await createEconomyAccountNameResolver()([first, second]);
		expect(resolved.map(item => item.displayName)).toEqual(['First', 'Second']);
		expect(mockGetUserApi).not.toHaveBeenCalled();
	});

	it('keeps a stale name on a failed refresh and retries at the expiry boundary', async () => {
		const resolve = createEconomyAccountNameResolver();
		const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
		mockGetUsersByIds
			.mockResolvedValueOnce([{ id: '42', displayName: 'First' }])
			.mockRejectedValueOnce(new Error('synthetic refresh failure'))
			.mockResolvedValueOnce([{ id: '42', displayName: 'Renamed' }]);

		expect((await resolve([account('42', 'Saved')]))[0].displayName).toBe('First');
		now.mockReturnValue(300999);
		expect((await resolve([account('42', 'Saved')]))[0].displayName).toBe('First');
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(1);

		now.mockReturnValue(301000);
		expect((await resolve([account('42', 'Saved')]))[0].displayName).toBe('First');
		expect((await resolve([account('42', 'Saved')]))[0].displayName).toBe('Renamed');
		expect(mockGetUsersByIds).toHaveBeenCalledTimes(3);
	});
});
