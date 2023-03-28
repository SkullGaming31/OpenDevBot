import { OAuth } from 'oauth';
import { TwitterApi } from 'twitter-api-v2';

const twitter_application_consumer_key = process.env.TWITTER_APPLICATION_COMSUMER_KEY;  // API Key
const twitter_application_secret = process.env.TWITTER_APPLICATION_SECRET;  // API Secret
const twitter_user_access_token = process.env.TWITTER_USER_ACCESS_TOKEN; // Access Token
const twitter_user_secret = process.env.TWITTER_USER_SECRET; // Access Token Secret

const twitterClient = new TwitterApi({
	appKey: twitter_application_consumer_key,
	appSecret: twitter_application_secret,
	accessSecret: twitter_user_secret,
	accessToken: twitter_user_access_token
});
const rwClient = twitterClient.readWrite;

export default {
	rwClient
};