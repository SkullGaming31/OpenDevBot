import { ApiClient } from '@twurple/api';
import { RefreshingAuthProvider } from '@twurple/auth';
import { getAuthProvider } from '../auth/authProvider';

/**
 * Initializes and returns an instance of the ApiClient configured with a RefreshingAuthProvider.
 * The logging level is determined by the current environment, defaulting to 'CRITICAL' in production.
 *
 * @returns {Promise<ApiClient>} A promise that resolves to the initialized ApiClient.
 */
export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider: RefreshingAuthProvider = await getAuthProvider();
	const environment = process.env.Enviroment || 'prod';
	const minLevel: 'ERROR' | 'INFO' | 'CRITICAL' | 'DEBUG' | 'WARNING' | 'TRACE' =
		environment === 'dev' || environment === 'debug' ? 'INFO' : 'CRITICAL';

	const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel } });

	return userApiClient;
}