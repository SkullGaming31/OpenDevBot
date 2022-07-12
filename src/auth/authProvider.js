const fs = require('fs/promises');
const { RefreshingAuthProvider } = require('@twurple/auth');

const config = require('../../config');

// (async () => {
//   const clientId = config.TWITCH_CLIENT_ID;
//   const clientSecret = config.TWITCH_CLIENT_SECRET;

//   const botTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/bot.json', 'UTF-8'));
//   const authProvider = new RefreshingAuthProvider({
//     clientId,
//     clientSecret,
//     onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/bot.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
//   }, botTokenData);

//   const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/users.json', 'UTF-8'));
//   const userAuthProvider = new RefreshingAuthProvider({
//     clientId,
//     clientSecret,
//     onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/users.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
//   }, userTokenData);

//   const modvlogTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/modvlog.json', 'UTF-8'));
//   const modvlogAuthProvider = new RefreshingAuthProvider({
//     clientId,
//     clientSecret,
//     onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/modvlog.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
//   }, modvlogTokenData);
// })();
const clientId = config.TWITCH_CLIENT_ID;
const clientSecret = config.TWITCH_CLIENT_SECRET;

async function authProvider() {
  const botTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/bot.json', 'UTF-8'));
  const authProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/bot.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  }, botTokenData);
}
async function userAuthProvider() {
  const userTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/users.json', 'UTF-8'));
  const userAuthProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/users.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  }, userTokenData);
}
async function modvlogAuthProvider() {
  const modvlogTokenData = JSON.parse(await fs.readFile('./src/auth/tokens/modvlog.json', 'UTF-8'));
  const modvlogAuthProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
    onRefresh: async (newTokenData) => await fs.writeFile('./src/auth/tokens/modvlog.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
  }, modvlogTokenData);
}

module.exports = {
  authProvider,
  userAuthProvider,
  modvlogAuthProvider
};