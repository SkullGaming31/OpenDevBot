import { jest } from '@jest/globals';

describe('authProvider', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('getAuthProvider preloads tokens and registers bot user', async () => {
		const mockTokens = [
			{ user_id: '111', access_token: 'a', refresh_token: 'r', scope: ['chat:read'], expires_in: 1000, obtainmentTimestamp: 1 },
			{ user_id: '659523613', access_token: 'botacc', refresh_token: 'botref', scope: ['chat:read', 'chat:edit'], expires_in: 2000, obtainmentTimestamp: 2 },
		];

		await jest.isolateModulesAsync(async () => {
			// Mock TokenModel
			const find = (jest.fn() as any);
			find.mockResolvedValue(mockTokens);
			const TokenModel = { find } as any;
			jest.doMock('../database/models/tokenModel', () => ({ TokenModel }));

			// Mock RefreshingAuthProvider implementation to capture calls
			const addUserForToken = (jest.fn() as any);
			addUserForToken.mockResolvedValue(undefined);
			const addUser = (jest.fn() as any);
			const onRefresh = (jest.fn() as any);

			class MockProvider {
				onRefresh: any;
				addUserForToken: any;
				addUser: any;
				constructor() {
					this.onRefresh = onRefresh;
					this.addUserForToken = addUserForToken;
					this.addUser = addUser;
				}
			}
			jest.doMock('@twurple/auth', () => ({ RefreshingAuthProvider: MockProvider }));

			const { getAuthProvider } = await import('../auth/authProvider');
			const provider: any = await getAuthProvider();

			// verify that addUserForToken called for each token
			expect(addUserForToken).toHaveBeenCalledTimes(mockTokens.length);
			// verify that addUser was called for the bot id
			expect(addUser).toHaveBeenCalledWith('659523613', expect.any(Object), expect.anything());
			// provider should be an instance of our mock
			expect(provider).toBeInstanceOf(MockProvider as any);
		});
	});

	test('getChatAuthProvider handles missing bot token gracefully', async () => {
		await jest.isolateModulesAsync(async () => {
			const findOne = (jest.fn() as any);
			findOne.mockResolvedValue(null);
			const TokenModel = { findOne } as any;
			jest.doMock('../database/models/tokenModel', () => ({ TokenModel }));

			const addUserForToken = (jest.fn() as any);
			class MockProvider {
				onRefresh: any;
				addUserForToken: any;
				constructor() {
					this.onRefresh = () => undefined;
					this.addUserForToken = addUserForToken;
				}
			}
			jest.doMock('@twurple/auth', () => ({ RefreshingAuthProvider: MockProvider }));

			const mockedLogger = require('../util/logger').default;
			const { getChatAuthProvider } = await import('../auth/authProvider');
			const provider: any = await getChatAuthProvider();

			expect(mockedLogger.warn).toHaveBeenCalled();
			expect(provider).toBeInstanceOf(MockProvider as any);
			// mockedLogger is a jest mock from src/__mocks__/util/logger.ts; no restore needed
		});
	});

	test('getChatAuthProvider falls back to addUser when addUserForToken fails', async () => {
		const botToken = { user_id: '659523613', access_token: 'botacc', refresh_token: 'r', scope: ['chat:read'], expires_in: 1000, obtainmentTimestamp: 1 };

		await jest.isolateModulesAsync(async () => {
			const findOneb = (jest.fn() as any);
			findOneb.mockResolvedValue(botToken);
			const TokenModel = { findOne: findOneb } as any;
			jest.doMock('../database/models/tokenModel', () => ({ TokenModel }));

			const addUserForToken = (jest.fn() as any);
			addUserForToken.mockRejectedValue(new Error('fail intent overload'));
			const addUser = (jest.fn() as any);
			class MockProvider {
				onRefresh: any;
				addUserForToken: any;
				addUser: any;
				constructor() {
					this.onRefresh = () => undefined;
					this.addUserForToken = addUserForToken;
					this.addUser = addUser;
				}
			}
			jest.doMock('@twurple/auth', () => ({ RefreshingAuthProvider: MockProvider }));

			const { getChatAuthProvider } = await import('../auth/authProvider');
			const provider: any = await getChatAuthProvider();

			expect(addUserForToken).toHaveBeenCalled();
			expect(addUser).toHaveBeenCalled();
			expect(provider).toBeInstanceOf(MockProvider as any);
		});
	});

	test('getAuthProvider logs token persistence failures without rejecting the refresh callback', async () => {
		const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };

		await jest.isolateModulesAsync(async () => {
			const find = (jest.fn() as any).mockResolvedValue([]);
			const findOneAndUpdate = (jest.fn() as any).mockRejectedValue(new Error('database write failed'));
			jest.doMock('../database/models/tokenModel', () => ({ TokenModel: { find, findOneAndUpdate } }));
			jest.doMock('../util/logger', () => ({ __esModule: true, default: logger }));

			class MockProvider {
				refreshCallback: any;
				onRefresh(callback: any) { this.refreshCallback = callback; }
				addUserForToken = jest.fn();
				addUser = jest.fn();
			}
			jest.doMock('@twurple/auth', () => ({ RefreshingAuthProvider: MockProvider }));

			const { getAuthProvider } = await import('../auth/authProvider');
			const provider: any = await getAuthProvider();
			await expect(provider.refreshCallback('111', {
				accessToken: 'access',
				refreshToken: 'refresh',
				scope: ['chat:read'],
				expiresIn: 3600,
				obtainmentTimestamp: 1,
			})).resolves.toBeUndefined();
			expect(findOneAndUpdate).toHaveBeenCalledWith(
				{ user_id: '111' },
				{
					$set: {
						access_token: 'access',
						refresh_token: 'refresh',
						scope: ['chat:read'],
						expires_in: 3600,
						obtainmentTimestamp: 1,
					},
				},
				{ upsert: true, returnDocument: 'after' }
			);
			expect(logger.error).toHaveBeenCalledWith(
				'AuthProvider: failed to persist refreshed token for user',
				'111',
				expect.any(Error)
			);
		});
	});

	test('getAuthProvider skips token records without a valid user ID', async () => {
		const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };
		const find = (jest.fn() as any).mockResolvedValue([
			{ access_token: 'orphaned-token', scope: ['chat:read'] },
		]);

		await jest.isolateModulesAsync(async () => {
			jest.doMock('../database/models/tokenModel', () => ({ TokenModel: { find } }));
			jest.doMock('../util/logger', () => ({ __esModule: true, default: logger }));

			class MockProvider {
				onRefresh = jest.fn();
				addUserForToken = jest.fn();
				addUser = jest.fn();
			}
			jest.doMock('@twurple/auth', () => ({ RefreshingAuthProvider: MockProvider }));

			const { getAuthProvider } = await import('../auth/authProvider');
			const provider = await getAuthProvider();

			expect(provider).toBeInstanceOf(MockProvider as any);
			expect(provider.addUserForToken).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'AuthProvider: skipping token record without a valid user ID'
			);
		});
	});
});