import { UserIdResolvable } from '@twurple/api';
import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
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
export async function getChatAuthProvider(): Promise<RefreshingAuthProvider> {
	const botEnvId = process.env.OPENDEVBOT_ID || process.env.OPEN_DEV_BOT_ID || '659523613';
	const botToken = await TokenModel.findOne({ user_id: String(botEnvId) }) as (ITwitchToken & { user_id: string }) | null;

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

	const newTokenData: AccessToken = {
		accessToken: botToken.access_token,
		refreshToken: botToken.refresh_token ?? null,
		scope: botToken.scope as any,
		expiresIn: botToken.expires_in ?? null,
		obtainmentTimestamp: botToken.obtainmentTimestamp ?? null,
	};

	try {
		// try overload with intents
		// @ts-ignore
		await provider.addUserForToken(newTokenData, { intents: ['chat'] });
		console.log('ChatAuthProvider: addUserForToken called with intents for', botEnvId);
	} catch (e) {
		try {
			// fallback to addUser with options
			// @ts-ignore
			provider.addUser(botEnvId as UserIdResolvable, newTokenData, newTokenData.scope ?? ['chat'], { intents: ['chat'] });
			console.log('ChatAuthProvider: addUser called with intents for', botEnvId);
		} catch (err) {
			try {
				provider.addUser(botEnvId as UserIdResolvable, newTokenData, newTokenData.scope ?? ['chat']);
				console.log('ChatAuthProvider: addUser called for', botEnvId);
			} catch (ee) {
				console.warn('ChatAuthProvider: failed to register bot user', ee);
			}
		}
	}

	// Note: previously we forced internal Twurple intent mappings here as a developer-only
	// workaround when SDK internals changed. That code was removing encapsulation and
	// caused maintenance burden. We now rely on supported public APIs and routine
	// addUser/addUserForToken fallbacks above. If a provider implementation change is
	// required in future, add an explicit adapter instead of mutating internals.

	return provider;
}