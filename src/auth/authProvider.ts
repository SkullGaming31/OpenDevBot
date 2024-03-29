import { UserIdResolvable } from '@twurple/api';
import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import { config } from 'dotenv';
import { ITwitchToken, TokenModel } from '../database/models/tokenModel';
config();

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;


export async function getAuthProvider(): Promise<RefreshingAuthProvider> {
	const tokenDataList: (ITwitchToken & { user_id: string })[] = await TokenModel.find();

	const authProvider = new RefreshingAuthProvider({ clientId, clientSecret });

	authProvider.onRefresh(async (userId: string, newTokenData: AccessToken) => {
		// console.log('Refreshing tokens for user', userId);
		// console.log('New token data:', newTokenData);
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