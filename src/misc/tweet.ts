import { OAuth } from 'oauth';
import { TwitterApi } from 'twitter-api-v2';

interface twitterAPI {
	twitter_application_consumer_key: string;
	twitter_application_secret: string;
	twitter_user_access_token: string;
	twitter_user_secret: string;
}

const twitter_application_consumer_key = process.env.TWITTER_APPLICATION_COMSUMER_KEY as string;  // API Key
const twitter_application_secret = process.env.TWITTER_APPLICATION_SECRET as string;  // API Secret
const twitter_user_access_token = process.env.TWITTER_USER_ACCESS_TOKEN as string; // Access Token
const twitter_user_secret = process.env.TWITTER_USER_SECRET as string; // Access Token Secret

const twitterClient = new TwitterApi({
	appKey: twitter_application_consumer_key,
	appSecret: twitter_application_secret,
	accessSecret: twitter_user_secret,
	accessToken: twitter_user_access_token
});
export const rwClient = twitterClient.readWrite;