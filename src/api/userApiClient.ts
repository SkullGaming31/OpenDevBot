import { ApiClient } from '@twurple/api';
import { getAuthProvider, getUserAuthProvider } from '../auth/authProvider';

export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider = await getUserAuthProvider();

	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });

	return userApiClient;
}

export async function getBotApi(): Promise<ApiClient> {
	const botAuthProvider = await getAuthProvider();

	const botApiClient = new ApiClient({ authProvider: botAuthProvider, logger: { minLevel: 'error' } });

	return botApiClient;
}