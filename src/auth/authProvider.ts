import { RefreshingAuthProvider, AccessToken } from '@twurple/auth';
import { promises as fs } from 'fs';

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;

export async function getAuthProvider(): Promise<RefreshingAuthProvider> {
	const botTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/token.659523613.json', 'utf-8'));
	const botAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (userId: string, newTokenData: AccessToken) => {
			await fs.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8');
		}
	});
	botAuthProvider.addUser('659523613', botTokenData, ['chat']);
	botAuthProvider.addIntentsToUser('659523613', ['chat']);
	return botAuthProvider;
}

export async function getUserAuthProvider(): Promise<RefreshingAuthProvider> {
	const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/token.31124455.json', 'utf-8'));
	const userAuthProvider = new RefreshingAuthProvider({
		clientId,
		clientSecret,
		onRefresh: async (userId: string, newTokenData: AccessToken) => { await fs.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8'); }
	});
	userAuthProvider.addUser('31124455', userTokenData, ['chat']);
	userAuthProvider.addIntentsToUser('31124455', ['chat']);
	return userAuthProvider;
}