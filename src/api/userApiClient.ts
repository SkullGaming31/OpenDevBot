import { ApiClient } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';
import { getAuthProvider } from '../auth/authProvider';

export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider: RefreshingAuthProvider = await getAuthProvider();
	const environment = process.env.Enviroment || 'prod';
	const minLevel: 'ERROR' | 'INFO' | 'CRITICAL' | 'DEBUG' | 'WARNING' | 'TRACE' =
			environment === 'dev' || environment === 'debug' ? 'INFO' : 'ERROR';

	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel } });

	return userApiClient;
}