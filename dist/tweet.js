"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twitter_api_v2_1 = require("twitter-api-v2");
const twitter_application_consumer_key = process.env.TWITTER_APPLICATION_COMSUMER_KEY; // API Key
const twitter_application_secret = process.env.TWITTER_APPLICATION_SECRET; // API Secret
const twitter_user_access_token = process.env.TWITTER_USER_ACCESS_TOKEN; // Access Token
const twitter_user_secret = process.env.TWITTER_USER_SECRET; // Access Token Secret
const twitterClient = new twitter_api_v2_1.TwitterApi({
    appKey: twitter_application_consumer_key,
    appSecret: twitter_application_secret,
    accessSecret: twitter_user_secret,
    accessToken: twitter_user_access_token
});
const rwClient = twitterClient.readWrite;
exports.default = {
    rwClient
};
