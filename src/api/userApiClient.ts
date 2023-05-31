import { ApiClient } from '@twurple/api';
import { getAuthProvider } from '../auth/authProvider';

export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider = await getAuthProvider();

	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });

	return userApiClient;
}