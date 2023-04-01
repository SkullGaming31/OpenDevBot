import { ApiClient } from '@twurple/api';
import { getUserAuthProvider } from '../auth/authProvider';

export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider = await getUserAuthProvider();

	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });

	return userApiClient;
}