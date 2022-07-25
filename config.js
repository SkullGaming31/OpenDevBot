require('dotenv').config();

/**
 * @typedef EnvironmentConfiguration
 * @prop {string} TWITCH_CLIENT_ID Client id for twitch
 * @prop {string} TWITCH_CLIENT_SECRET Twitch Client Secret
 * @prop {string} TWITCH_CLIENT_REDIRECT_HOST Client Redirect
 * @prop {string} TWITCH_EVENTSUB_SECRET eventsub secret for twitch helix
 * @prop {string} MONGO_USER Mongo DB Username
 * @prop {string} MONGO_PASS Mongo DB PasswordskulledbotTwitch/config.js
 * @prop {string} MONGO_DB Mongo Database Name
 * @prop {string} MONGO_HOST Mongo Database Host
 * @prop {string} TWITTER_USER_SECRET twitter user secret
 * @prop {string} TWITTER_USER_ACCESS_TOKEN Twitter Access Token
 * @prop {string} TWITTER_APPLICATION_SECRET twitter app secret
 * @prop {string} TWITTER_APPLICATION_COMSUMER_KEY something from twitter
 * @prop {string} DISCORD_WEBHOOK_ID ID for the discord Webhook
 * @prop {string} DISCORD_WEBHOOK_TOKEN Token for the Discord Webhook
 * @prop {string} DISCORD_WEBHOOK_PROMOTE_URL WEBHOOK URL for the Promotion channel
 * @prop {string} DISCORD_COMMAND_USAGE_URL Webhook URL for Twitch Logs Channel
 * @prop {string} MOD_DISCORD_WEBHOOK_PROMOTE_URL Webhook URL for the promotion channel of Modvlog
 * @prop {string} MOD_DISCORD_COMMAND_USAGE_URL Webhook URL for modvlogs modlogs channel in discord
 * @prop {string} PORT the port to listen on
 * @prop {string} POSTGRES_PASSWORD Password used for supabase
 * @prop {string} POSTGRES_API_KEY Api key to access postgres database
 * @prop {string} POSTGRES_SERVICE_ROLE Postgres service role
 * @prop {string} PROJECT_URL URL for the project for http requests
 * @prop {string} PROJECT_JWT_SECRET secret for supabase through JWT
 */

/**
 * @type {EnvironmentConfiguration}
 */

const config = {
	...process.env,
};

module.exports = config;