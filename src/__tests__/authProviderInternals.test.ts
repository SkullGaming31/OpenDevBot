describe('authProvider internals safety', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	test('getChatAuthProvider does not mutate provider internals', async () => {
		await jest.isolateModulesAsync(async () => {
			const botToken = { user_id: '659523613', access_token: 'botacc', refresh_token: 'r', scope: ['chat:read'], expires_in: 1000, obtainmentTimestamp: 1 };
			const findOne = (jest.fn() as any);
			findOne.mockResolvedValue(botToken);
			const TokenModel = { findOne } as any;
			jest.doMock('../src/database/models/tokenModel', () => ({ TokenModel }));

			// Create a mock provider that exposes _intentToUserId and _userIdToIntents
			const onRefresh = jest.fn();
			class MockProvider {
				onRefresh: any;
				addUserForToken: any;
				addUser: any;
				// internals that should NOT be mutated by getChatAuthProvider
				_intentToUserId: any;
				_userIdToIntents: any;
				constructor() {
					this.onRefresh = onRefresh;
					this.addUserForToken = jest.fn();
					this.addUser = jest.fn();
					// Start with empty/undefined internals to simulate the provider's private state
					this._intentToUserId = undefined;
					this._userIdToIntents = undefined;
				}
			}
			jest.doMock('@twurple/auth', () => ({ RefreshingAuthProvider: MockProvider }));

			const { getChatAuthProvider } = await import('../auth/authProvider');
			const provider: any = await getChatAuthProvider();

			// provider should be an instance of MockProvider
			expect(provider).toBeInstanceOf(MockProvider as any);

			// Assert that we did not create or mutate internal maps/objects on the provider
			expect(provider._intentToUserId).toBeUndefined();
			expect(provider._userIdToIntents).toBeUndefined();
		});
	});
});
