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
            NODE_ENV: dev | prod | debug;
            ENABLE_CHAT: boolean
            ENABLE_EVENTSUB: boolean
        }
    }
}

export { };
