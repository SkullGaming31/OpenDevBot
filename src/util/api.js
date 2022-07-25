const { ApiClient } = require('@twurple/api');
const { RefreshingAuthProvider, ClientCredentialsAuthProvider } = require('@twurple/auth');
const fs = require('fs/promises');

const config = require('../config');

(async () => {
  const clientId = config.TWITCH_CLIENT_ID;
  const clientSecret = config.TWITCH_CLIENT_SECRET;
  const eventSubSecret = config.TWITCH_EVENTSUB_SECRET;

  const appAuthProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
  const apiClient = new ApiClient({ authProvider: appAuthProvider, logger: { minLevel: 'critical' } });
  const userApiClient = new ApiClient({ authProvider: userAuthProvider, logger: { minLevel: 'error' } });
  const modvlogApiClient = new ApiClient({ authProvider: modvlogAuthProvider, logger: { minLevel: 'error' } });
  await apiClient.eventSub.deleteAllSubscriptions();

  const tokenData = JSON.parse(await fs.readFile('./src/auth/tokens/tokens.json', 'UTF-8'));
  const authProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  }, tokenData);

  const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/users.json', 'UTF-8'));
  const userAuthProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/users.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  }, userTokenData);

  const modvlogTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/modvlog.json', 'UTF-8'));
  const modvlogAuthProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/modvlog.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  }, modvlogTokenData);
})();