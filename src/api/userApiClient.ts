import { ApiClient } from '@twurple/api';
import { getAuthProvider } from '../auth/authProvider';

export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider = await getAuthProvider();
	const isProduction = process.env.NODE_ENV === 'production';
	const minLevel: 'ERROR' | 'INFO' | 'CRITICAL' | 'DEBUG' | 'WARNING' | 'TRACE' = isProduction ? 'ERROR' : 'INFO';

	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel } });

	return userApiClient;
}