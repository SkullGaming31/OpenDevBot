require('dotenv').config();

/**
 * @typedef EnvironmentConfiguration
 * @prop {string} TWITCH_CLIENT_ID Client id for twitch
 * @prop {string} TWITCH_CLIENT_SECRET Twitch Client Secret
 * @prop {string} TWITCH_CLIENT_REDIRECT_HOST Client Redirect
 * @prop {string} TWITCH_EVENTSUB_SECRET eventsub secret for twitch helix
 * @prop {string} MONGO_USER Mongo DB Username
 * @prop {string} MONGO_PASS Mongo DB Password
 * @prop {string} MONGO_DB Mongo Database Name
 * @prop {string} MONGO_HOST Mongo Database Host
 * @prop {string} TWITTER_USER_SECRET twitter user secret
 * @prop {string} TWITTER_USER_ACCESS_TOKEN Twitter Access Token
 * @prop {string} TWITTER_APPLICATION_SECRET twitter app secret
 * @prop {string} TWITTER_APPLICATION_COMSUMER_KEY something from twitter
 * @prop {string} DISCORD_WEBHOOK_ID ID for the discord Webhook
 * @prop {string} DISCORD_WEBHOOK_TOKEN Token for the Discord Webhook
 * @prop {string} DISCORD_WEBHOOK_PROMOTE_URL WEBHOOK URL for the Promotion channel
 * @prop {string} PORT the port to listen on
 */

/**
 * @type {EnvironmentConfiguration}
 */

const config = {
	...process.env,
};

module.exports = config;