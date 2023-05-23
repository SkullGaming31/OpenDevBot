declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TWITCH_CLIENT_ID: string;
            TWITCH_CLIENT_SECRET: string;
            TWITCH_EVENTSUB_SECRET: string;
            TWITCH_REDIRECT_URL: string;
            DEV_DISCORD_BOT_TOKEN: string;
            DEV_DISCORD_CLIENT_ID: string;
            DEV_DISCORD_CLIENT_SECRET: string;
            DEV_DISCORD_GUILD_ID: string;
            DEV_DISCORD_PROMOTE_CHANNEL_ID: string;
            DEV_DISCORD_LOGS_CHANNEL_ID: string;
            DEV_DISCORD_ADMIN_ROLE_ID: string;
            DEV_DISCORD_MOD_ROLE_ID: string;
            DEV_DISCORD_WEBHOOK_ID: string;
            DEV_DISCORD_WEBHOOK_TOKEN: string;
            DEV_DISCORD_WEBHOOK_URL: string;
            DEV_DISCORD_ERROR_LOGS_ID: string;
            DEV_DISCORD_ERROR_WEBHOOK: string;
            DEV_DISCORD_PROMOTE_WEBHOOK_ID: string;
            DEV_DISCORD_PROMOTE_WEBHOOK_TOKEN: string;
						DEV_DISCORD_TWITCH_ACTIVITY_ID: string;
						DEV_DISCORD_TWITCH_ACTIVITY_TOKEN: string;
            DEV_DISCORD_FEATURE_REQUEST: string;
            DISCORD_COMMAND_USAGE_ID: string;
            DISCORD_COMMAND_USAGE_TOKEN: string;
            PORT: string;
            MONGO_USER: string;
            MONGO_PASS: string;
            MONGO_DB: string;
            MONGO_URI: string;
            MYSQL_HOST: string;
						MYSQL_USER: string;
						MYSQL_PASSWORD: string;
						MYSQL_DATABASE: string;
            TWITTER_USER_SECRET: string;
            TWITTER_USER_ACCESS_TOKEN: string;
            TWITTER_APPLICATION_SECRET: string;
            TWITTER_APPLICATION_COMSUMER_KEY: string;
            NODE_ENV: dev | prod | debug;
        }
    }
}

export { };
