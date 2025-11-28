import type { ApiClient } from '@twurple/api';
import type { RefreshingAuthProvider } from '@twurple/auth';
import { getAuthProvider } from '../auth/authProvider';
import ENVIRONMENT from '../util/env';

/**
 * Initializes and returns an instance of the ApiClient configured with a RefreshingAuthProvider.
 * The logging level is determined by the current environment, defaulting to 'CRITICAL' in production.
 *
 * @returns {Promise<ApiClient>} A promise that resolves to the initialized ApiClient.
 */
export async function getUserApi(): Promise<ApiClient> {
	const userAuthProvider: RefreshingAuthProvider = await getAuthProvider();
	const environment = ENVIRONMENT || 'prod';
	const minLevel: 'ERROR' | 'INFO' | 'CRITICAL' | 'DEBUG' | 'WARNING' | 'TRACE' =
		environment === 'dev' || environment === 'debug' ? 'INFO' : 'CRITICAL';

	// Dynamically import ApiClient at runtime to avoid loading an ESM-only package
	const apiModule = await import('@twurple/api');
	const ApiClientCtor = apiModule.ApiClient as new (opts: { authProvider: unknown; logger?: unknown }) => ApiClient;
	const userApiClient = new ApiClientCtor({ authProvider: userAuthProvider, logger: { minLevel } });

	return userApiClient;
}