const { ApiClient } = require('@twurple/api');
const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { authProvider, modvlogAuthProvider, userAuthProvider } = require('../auth/authProvider');

const config = require('../../config');

const clientId = config.TWITCH_CLIENT_ID;
const clientSecret = config.TWITCH_CLIENT_SECRET;

const appAuthProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
const apiClient = new ApiClient({ authProvider: appAuthProvider, logger: { minLevel: 'critical' } });
const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });
const modvlogApiClient = new ApiClient({ authProvider: modvlogAuthProvider, logger: { minLevel: 'error' } });

module.exports = {
	apiClient,
	userApiClient,
	modvlogApiClient
};