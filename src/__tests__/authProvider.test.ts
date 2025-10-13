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

            const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            const { getChatAuthProvider } = await import('../auth/authProvider');
            const provider: any = await getChatAuthProvider();

            expect(consoleWarn).toHaveBeenCalled();
            expect(provider).toBeInstanceOf(MockProvider as any);
            consoleWarn.mockRestore();
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
});
