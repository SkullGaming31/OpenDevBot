const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Channel, GuildMember, GuildScheduledEvent, Message, Reaction, ThreadMember, User } = Partials;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildWebhooks
  ],
  allowedMentions: [
    {
      parse: [
        'EVERYONE',
        'USERS',
        'ROLES'
      ]
    }
  ],
  partials: [Channel, GuildMember, GuildScheduledEvent, Message, Reaction, ThreadMember, User],
  presence: {
    activities: [
      {
        name: 'TWITCH-CHAT',
        type: 'STREAMING'
      }
    ],
    afk: false,
  }
});
module.exports = client;