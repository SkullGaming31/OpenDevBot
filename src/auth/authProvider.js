const fs = require('fs/promises');
const { RefreshingAuthProvider } = require('@twurple/auth');

const config = require('../../config');


const clientId = config.TWITCH_CLIENT_ID;
const clientSecret = config.TWITCH_CLIENT_SECRET;

//trying to export the auth providers so they can be used in any file
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