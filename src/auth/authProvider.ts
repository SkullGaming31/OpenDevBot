import { RefreshingAuthProvider, AppTokenAuthProvider, AccessToken } from '@twurple/auth';
import { promises as fs } from 'fs';

(async () => {
	const clientId = process.env.TWITCH_CLIENT_ID as string;
	const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;

	const botTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/token.659523613.json', 'utf-8'));// 659523613
	const authProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (userId: string, newTokenData: AccessToken) => await fs.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8')
		
	});
	authProvider.addUser('659523613', botTokenData, ['chat']);
	authProvider.addIntentsToUser('659523613', ['chat']);

	const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/token.31124455.json', 'utf-8'));// 31124455
	const userAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (userId: string, newTokenData: AccessToken) => await fs.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8')
	});
	userAuthProvider.addUser('31124455', userTokenData, ['chat']);
	userAuthProvider.addIntentsToUser('31124455', ['chat']);
})();