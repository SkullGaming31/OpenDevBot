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
				scopes: newTokenData.scope,
				expiresIn: newTokenData.expiresIn,
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
			authProvider.addUser(user_id as UserIdResolvable, newTokenData, ['chat']);
		}
	}
	return authProvider;
}