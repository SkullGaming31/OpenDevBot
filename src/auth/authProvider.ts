import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import { IToken, TokenModel } from '../database/models/tokenModel';

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;

export async function getAuthProvider(): Promise<RefreshingAuthProvider> {
	const tokenDataList = await TokenModel.find();
	const authProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (userId: string, newTokenData: AccessToken) => {
			await TokenModel.updateOne({ twitchId: userId }, newTokenData, { upsert: true });
		},
	});

	for (const tokenData of tokenDataList) {
		const { twitchId } = tokenData;
		authProvider.addUser(twitchId, transformTokenData(tokenData), ['chat']);
		authProvider.addIntentsToUser(twitchId, ['chat']);
	}
	return authProvider;
}

function transformTokenData(tokenData: IToken): AccessToken {
	const { access_token, refresh_token, scope, obtainmentTimestamp, expires_in } = tokenData;
	return {
		accessToken: access_token,
		refreshToken: refresh_token,
		scope: scope || [],
		obtainmentTimestamp: obtainmentTimestamp,
		expiresIn: expires_in,
	};
}

// const clientId = process.env.TWITCH_CLIENT_ID as string;
// const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;

// export async function getAuthProvider(): Promise<RefreshingAuthProvider> {
// 	const botTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/token.659523613.json', 'utf-8'));
// 	const botAuthProvider = new RefreshingAuthProvider({
// 		clientId,
// 		clientSecret,
// 		onRefresh: async (userId: string, newTokenData: AccessToken) => {
// 			await fs.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8');
// 		}
// 	});
// 	botAuthProvider.addUser('659523613', botTokenData, ['chat']);
// 	botAuthProvider.addIntentsToUser('659523613', ['chat']);
// 	return botAuthProvider;
// }

// export async function getUserAuthProvider(): Promise<RefreshingAuthProvider> {
// 	const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/token.31124455.json', 'utf-8'));
// 	const userAuthProvider = new RefreshingAuthProvider({
// 		clientId,
// 		clientSecret,
// 		onRefresh: async (userId: string, newTokenData: AccessToken) => { await fs.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8'); }
// 	});
// 	userAuthProvider.addUser('31124455', userTokenData, ['chat']);
// 	userAuthProvider.addIntentsToUser('31124455', ['chat']);
// 	return userAuthProvider;
// }