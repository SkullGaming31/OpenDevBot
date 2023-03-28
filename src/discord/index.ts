import { Client, GatewayIntentBits, Partials } from 'discord.js';

const { Channel, GuildMember, GuildScheduledEvent, Message, Reaction, ThreadMember, User } = Partials;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildWebhooks
  ],
  partials: [Channel, GuildMember, GuildScheduledEvent, Message, Reaction, ThreadMember, User],
  presence: {
    afk: false,
  }
});
export default client;