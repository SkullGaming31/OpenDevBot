import { UserIdResolvable } from '@twurple/api';
import { AccessToken, RefreshingAuthProvider, StaticAuthProvider } from '@twurple/auth';
import { config } from 'dotenv';
import { ITwitchToken, TokenModel } from '../database/models/tokenModel';
config();

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;


/**
 * Creates a RefreshingAuthProvider that automatically refreshes tokens when they expire
 * and updates the tokens in the database. The provider is pre-populated with the tokens
 * from the database, and the user with id 659523613 is added as a user that can be used
 * for requests that require the chat scope.
 * @returns The RefreshingAuthProvider
 */
export async function getAuthProvider(): Promise<RefreshingAuthProvider> {
	const tokenDataList: (ITwitchToken & { user_id: string })[] = await TokenModel.find();

	const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

	authProvider.onRefresh(async (userId: string, newTokenData: AccessToken) => {
		const tbd = await TokenModel.findOneAndUpdate(
			{ user_id: userId },
			{
				access_token: newTokenData.accessToken,
				refresh_token: newTokenData.refreshToken,
				scope: newTokenData.scope,
				expires_in: newTokenData.expiresIn,
				obtainmentTimestamp: newTokenData.obtainmentTimestamp,
			},
			{ upsert: true, new: true }
		);
		// console.log('Tokens updated in the database', tbd);
	});
	for (const tokenData of tokenDataList) {
		const { user_id, access_token, refresh_token, scope, expires_in, obtainmentTimestamp } = tokenData;
		const newTokenData: AccessToken = {
			accessToken: access_token,
			refreshToken: refresh_token ?? null,
			scope: scope,
			expiresIn: expires_in ?? null,
			obtainmentTimestamp: obtainmentTimestamp ?? null,
		};
		await authProvider.addUserForToken(newTokenData);
		if (user_id === '659523613') {
			// Provide the actual scopes from the stored token so the provider has correct permissions (do not force just 'chat')
			authProvider.addUser(user_id as UserIdResolvable, newTokenData, newTokenData.scope ?? ['chat']);
		}
	}
	return authProvider;
}

/**
 * Returns a RefreshingAuthProvider preloaded only with the configured bot user's token
 * and attempts to register the 'chat' intent so ChatClient connects with the bot.
 */
export async function getChatAuthProvider(): Promise<RefreshingAuthProvider | StaticAuthProvider> {
	const botEnvId = process.env.OPENDEVBOT_ID || process.env.OPEN_DEV_BOT_ID || '659523613';
	type BotTokenRecord = ITwitchToken & { user_id: string; scope: string[] | string };
	const botToken = await TokenModel.findOne({ user_id: String(botEnvId) }) as BotTokenRecord | null;

	const provider = new RefreshingAuthProvider({ clientId, clientSecret });

	provider.onRefresh(async (userId: string, newTokenData: AccessToken) => {
		try {
			await TokenModel.findOneAndUpdate(
				{ user_id: userId },
				{
					access_token: newTokenData.accessToken,
					refresh_token: newTokenData.refreshToken,
					scope: newTokenData.scope,
					expires_in: newTokenData.expiresIn,
					obtainmentTimestamp: newTokenData.obtainmentTimestamp,
				},
				{ upsert: true, new: true }
			);
		} catch (e) {
			console.warn('ChatAuthProvider: failed to persist refreshed token', e);
		}
	});

	if (!botToken) {
		console.warn('ChatAuthProvider: no bot token found in DB for', botEnvId);
		return provider;
	}

	// Normalize scope which may be stored as an array or space-separated string in DB
	const rawScope = botToken.scope as unknown;
	let normalizedScope: string[];
	if (Array.isArray(rawScope)) {
		normalizedScope = rawScope;
	} else if (typeof rawScope === 'string') {
		normalizedScope = rawScope.split(' ');
	} else {
		normalizedScope = [];
	}

	const newTokenData: AccessToken = {
		accessToken: botToken.access_token,
		refreshToken: botToken.refresh_token ?? null,
		scope: normalizedScope,
		expiresIn: botToken.expires_in ?? null,
		obtainmentTimestamp: botToken.obtainmentTimestamp ?? null,
	};

	let registrationFailed = false;
	try {
		// try overload with intents if available
		try {
			// Try addUserForToken with options if available on this provider implementation
			const provRec = provider as unknown as Record<string, unknown>;
			const addUserForTokenFn = provRec.addUserForToken as ((token: AccessToken, opts?: unknown) => Promise<unknown>) | undefined;
			if (typeof addUserForTokenFn === 'function') {
				await addUserForTokenFn.call(provider, newTokenData, { intents: ['chat'] });
				console.log('ChatAuthProvider: addUserForToken called with intents for', botEnvId);
			} else {
				const addUserWithOpts = provRec.addUser as ((userId: string, token: AccessToken, scope?: string[] | string, opts?: unknown) => unknown) | undefined;
				if (typeof addUserWithOpts === 'function') {
					try {
						addUserWithOpts.call(provider, String(botEnvId), newTokenData, newTokenData.scope ?? ['chat'], { intents: ['chat'] });
						console.log('ChatAuthProvider: addUser called with intents for', botEnvId);
					} catch (err) {
						try {
							provider.addUser(botEnvId as UserIdResolvable, newTokenData, newTokenData.scope ?? ['chat']);
							console.log('ChatAuthProvider: addUser called for', botEnvId);
						} catch (ee) {
							console.warn('ChatAuthProvider: failed to register bot user', ee);
							registrationFailed = true;
						}
					}
				} else {
					try {
						provider.addUser(botEnvId as UserIdResolvable, newTokenData, newTokenData.scope ?? ['chat']);
						console.log('ChatAuthProvider: addUser called for', botEnvId);
					} catch (ee) {
						console.warn('ChatAuthProvider: failed to register bot user', ee);
						registrationFailed = true;
					}
				}
			}
		} catch (e) {
			try {
				provider.addUser(botEnvId as UserIdResolvable, newTokenData, newTokenData.scope ?? ['chat']);
				console.log('ChatAuthProvider: addUser called for', botEnvId);
			} catch (ee) {
				console.warn('ChatAuthProvider: failed to register bot user', ee);
				registrationFailed = true;
			}
		}
	} catch (e) {
		// unexpected outer error
		console.warn('ChatAuthProvider: unexpected error during registration', e);
		registrationFailed = true;
	}

	// Note: previously we forced internal Twurple intent mappings here as a developer-only
	// workaround when SDK internals changed. That code was removing encapsulation and
	// caused maintenance burden. We now rely on supported public APIs and routine
	// addUser/addUserForToken fallbacks above. If a provider implementation change is
	// required in future, add an explicit adapter instead of mutating internals.

	// Try to explicitly register the 'chat' intent via public API if available.
	try {
		const anyProv = provider as unknown as Record<string, unknown>;
		// Twurple v7 exposes addIntentsToUser(user, intents)
		const addIntents = anyProv.addIntentsToUser;
		if (typeof addIntents === 'function') {
			try {
				const fn = addIntents as (userId: string, intents: string[]) => unknown;
				fn.call(provider, botEnvId, ['chat']);
				console.log('ChatAuthProvider: addIntentsToUser called for', botEnvId);
			} catch (e) {
				console.warn('ChatAuthProvider: addIntentsToUser threw an error', String(e));
			}
		}
	} catch (e) {
		// ignore
	}

	// Only fallback to StaticAuthProvider if registration actually failed above.
	if (registrationFailed) {
		try {
			console.warn('ChatAuthProvider: registration failed; falling back to StaticAuthProvider for chat');
			return new StaticAuthProvider(clientId, newTokenData.accessToken ?? '');
		} catch (e) {
			console.warn('ChatAuthProvider: failed to create StaticAuthProvider fallback', e);
		}
	}

	return provider;
}
