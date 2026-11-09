import type { IBankAccount } from '../src/database/models/bankAccount';
import { createEconomyAccountNameResolver } from '../src/services/economyAccountNames';

const mockFind = jest.fn();
const mockGetUsersByIds = jest.fn();
const mockGetUserApi = jest.fn();

jest.mock('../src/database/models/userModel', () => ({ UserModel: { find: (...args: unknown[]) => mockFind(...args) } }));
jest.mock('../src/api/userApiClient', () => ({ getUserApi: () => mockGetUserApi() }));

describe('economy account name fallback regressions', () => {
	beforeEach(() => {
		mockFind.mockReset().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
		mockGetUsersByIds.mockReset();
		mockGetUserApi.mockReset().mockResolvedValue({ users: { getUsersByIds: mockGetUsersByIds } });
	});

	it('ignores unrelated Twitch users and retries unresolved IDs rather than caching a miss', async () => {
		const resolve = createEconomyAccountNameResolver();
		const accounts = [{ userId: '42', username: 'Saved', balance: { bank: 0, wallet: 0 } }] as IBankAccount[];
		mockGetUsersByIds
			.mockResolvedValueOnce([{ id: '99', displayName: 'Unrelated' }, { id: '42', displayName: '' }])
			.mockResolvedValueOnce([{ id: '42', displayName: 'Fresh' }]);

		expect((await resolve(accounts))[0].displayName).toBe('Saved');
		expect((await resolve(accounts))[0].displayName).toBe('Fresh');
		expect(mockGetUsersByIds.mock.calls.map(call => call[0])).toEqual([['42'], ['42']]);
		expect(accounts[0].username).toBe('Saved');
	});

	it('uses an explicit fallback when both ID and username are absent', async () => {
		const accounts = [{ balance: { bank: 0, wallet: 0 } }] as IBankAccount[];
		const result = await createEconomyAccountNameResolver()(accounts);
		expect(result.map(account => account.displayName)).toEqual(['Unknown user']);
		expect(mockFind).not.toHaveBeenCalled();
		expect(mockGetUserApi).not.toHaveBeenCalled();
	});
});
