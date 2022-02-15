const { OAuth } = require('oauth');
const config = require('../config');
const { TwitterApi } = require('twitter-api-v2');

const twitter_application_consumer_key = config.TWITTER_APPLICATION_COMSUMER_KEY;  // API Key
const twitter_application_secret = config.TWITTER_APPLICATION_SECRET;  // API Secret
const twitter_user_access_token = config.TWITTER_USER_ACCESS_TOKEN; // Access Token
const twitter_user_secret = config.TWITTER_USER_SECRET; // Access Token Secret

const twitterClient = new TwitterApi({
	appKey: twitter_application_consumer_key,
	appSecret: twitter_application_secret,
	accessSecret: twitter_user_secret,
	accessToken: twitter_user_access_token
});
const rwClient = twitterClient.readWrite;

module.exports = {
	rwClient
};