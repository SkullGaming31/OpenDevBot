import { Client, GatewayIntentBits, Partials } from 'discord.js';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildWebhooks]
});